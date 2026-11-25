import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthenticatedRequest } from '../../middleware/auth';

export const checkoutCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User not identified' });
    }

    const {
      customerId,
      customerPhone,
      customerName,
      items, // Array of { productVariantId, quantity, unitPrice, discountAmount, taxAmount }
      billDiscount = 0,
      paymentMethod = 'CASH',
      cashPaid,
      digitalPaid,
      exchangeItems, // Optional: Array of { productVariantId, quantity, creditAmount, reason }
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty. At least one item is required.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get or create customer if provided
      let resolvedCustomerId = customerId || null;
      if (!resolvedCustomerId && customerPhone && customerPhone.trim()) {
        const phone = customerPhone.trim();
        let customer = await tx.customer.findUnique({ where: { phone } });
        if (!customer) {
          customer = await tx.customer.create({
            data: {
              phone,
              name: customerName ? customerName.trim() : 'Customer',
            },
          });
        }
        resolvedCustomerId = customer.id;
      }

      // 2. Resolve invoice number from settings
      let settings = await tx.storeSettings.findFirst();
      if (!settings) {
        settings = await tx.storeSettings.create({ data: {} });
      }

      const invoiceNumber = `${settings.invoicePrefix}${settings.nextInvoiceNum}`;
      await tx.storeSettings.update({
        where: { id: settings.id },
        data: { nextInvoiceNum: { increment: 1 } },
      });

      // 3. Process items and verify stock
      let subtotal = 0;
      let totalItemDiscount = 0;
      let totalTaxAmount = 0;
      const orderItemData: any[] = [];

      for (const cartItem of items) {
        const qty = Number(cartItem.quantity);
        if (qty <= 0) {
          throw new Error('Item quantity must be at least 1');
        }

        const variant = await tx.productVariant.findUnique({
          where: { id: cartItem.productVariantId },
          include: { product: true },
        });

        if (!variant) {
          throw new Error(`Variant not found for ID: ${cartItem.productVariantId}`);
        }

        if (variant.currentStock < qty) {
          throw new Error(
            `Insufficient stock for "${variant.product.name} (${variant.size}/${variant.color})". Available: ${variant.currentStock}, Requested: ${qty}`
          );
        }

        const unitPrice = Number(cartItem.unitPrice ?? variant.sellingPrice);
        const itemDiscount = Number(cartItem.discountAmount || 0);
        const tax = Number(cartItem.taxAmount || 0);
        const lineNet = (unitPrice * qty) - itemDiscount + tax;

        subtotal += unitPrice * qty;
        totalItemDiscount += itemDiscount;
        totalTaxAmount += tax;

        orderItemData.push({
          productVariantId: variant.id,
          quantity: qty,
          mrpSnapshot: variant.mrp,
          unitPrice,
          discountAmount: itemDiscount,
          taxAmount: tax,
          netAmount: lineNet,
          costPriceSnapshot: variant.costPrice, // Crucial: freeze cost price for life of order
        });

        // Decrement variant stock
        const updatedVariant = await tx.productVariant.update({
          where: { id: variant.id },
          data: { currentStock: { decrement: qty } },
        });

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            productVariantId: variant.id,
            type: 'SALE_DEDUCTION',
            quantity: -qty,
            referenceId: invoiceNumber,
            balanceAfter: updatedVariant.currentStock,
            notes: `POS Sale Invoice: ${invoiceNumber}`,
          },
        });
      }

      // 3b. Process returned/exchanged garments (if any)
      let totalExchangeCredit = 0;
      const orderReturnData: any[] = [];

      if (exchangeItems && Array.isArray(exchangeItems) && exchangeItems.length > 0) {
        for (const exItem of exchangeItems) {
          const exQty = Math.max(1, Number(exItem.quantity) || 1);
          const exCredit = Math.max(0, Number(exItem.creditAmount) || 0);
          totalExchangeCredit += exCredit;

          const variantId = exItem.productVariantId || exItem.variantId;
          let variantDesc = 'Exchanged Item';
          if (variantId) {
            const exVariant = await tx.productVariant.findUnique({
              where: { id: variantId },
              include: { product: true },
            });

            if (exVariant) {
              variantDesc = `${exVariant.product.name} (${exVariant.size}/${exVariant.color})`;

              // Increment stock of returned garment
              const updatedExVariant = await tx.productVariant.update({
                where: { id: exVariant.id },
                data: { currentStock: { increment: exQty } },
              });

              // Log stock movement for inventory integrity
              await tx.stockMovement.create({
                data: {
                  productVariantId: exVariant.id,
                  type: 'SALE_RETURN',
                  quantity: exQty,
                  referenceId: invoiceNumber,
                  balanceAfter: updatedExVariant.currentStock,
                  notes: `POS Exchange in Invoice: ${invoiceNumber}. Restocked: ${variantDesc}`,
                },
              });
            }
          }

          orderReturnData.push({
            refundAmount: exCredit,
            reason: exItem.reason?.trim() || `Exchange: ${variantDesc}`,
            processedById: userId,
          });
        }
      }

      const totalBillDiscount = Number(billDiscount || 0);
      const grossAfterDiscounts = subtotal - totalItemDiscount - totalBillDiscount + totalTaxAmount;
      const netAmount = Math.max(0, grossAfterDiscounts - totalExchangeCredit);

      // 4. Create Order
      const order = await tx.order.create({
        data: {
          invoiceNumber,
          customerId: resolvedCustomerId,
          userId,
          subtotal,
          itemDiscount: totalItemDiscount,
          billDiscount: totalBillDiscount,
          taxAmount: totalTaxAmount,
          netAmount,
          paymentMethod,
          cashPaid: cashPaid !== undefined ? Number(cashPaid) : null,
          digitalPaid: digitalPaid !== undefined ? Number(digitalPaid) : null,
          status: 'COMPLETED',
          cancellationReason: totalExchangeCredit > 0 ? `Exchange Credit Applied: ₹${totalExchangeCredit.toFixed(2)}` : null,
          items: {
            create: orderItemData,
          },
          ...(orderReturnData.length > 0
            ? {
                returns: {
                  create: orderReturnData,
                },
              }
            : {}),
        },
        include: {
          items: {
            include: {
              variant: {
                include: { product: true },
              },
            },
          },
          returns: true,
          customer: true,
          user: { select: { id: true, employeeName: true } },
        },
      });

      // 5. Update customer loyalty if registered
      if (resolvedCustomerId) {
        await tx.customer.update({
          where: { id: resolvedCustomerId },
          data: {
            totalPurchases: { increment: netAmount },
            loyaltyPoints: { increment: Math.floor(netAmount / 100) }, // 1 point per ₹100
          },
        });
      }

      return order;
    });

    return res.status(201).json({
      message: 'Sale completed successfully',
      order: result,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return res.status(400).json({ error: error.message || 'Checkout failed' });
  }
};

export const listOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, paymentMethod, status, startDate, endDate, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      const s = String(search).trim();
      where.OR = [
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
        { customer: { phone: { contains: s, mode: 'insensitive' } } },
        { customer: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          user: { select: { id: true, employeeName: true } },
          returns: { select: { id: true, refundAmount: true, reason: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({
      orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user?.role === 'ADMIN';

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { id: true, employeeName: true, username: true } },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { id: true, name: true, itemCode: true, hsnCode: true, gstRate: true },
                },
              },
            },
          },
        },
        returns: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Query any SALE_RETURN movements associated with this invoice (Garment Exchanges / Returns)
    const exchangeMovements = await prisma.stockMovement.findMany({
      where: {
        referenceId: order.invoiceNumber,
        type: 'SALE_RETURN',
      },
      include: {
        variant: {
          include: {
            product: { select: { id: true, name: true, itemCode: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let restockedCost = 0;
    const exchangeDetails = exchangeMovements.map((sm) => {
      const unitCost = Number(sm.variant.costPrice || 0);
      const unitSelling = Number(sm.variant.sellingPrice || 0);
      const costTotal = unitCost * sm.quantity;
      restockedCost += costTotal;
      return {
        id: sm.id,
        variantId: sm.productVariantId,
        productName: sm.variant.product.name,
        itemCode: sm.variant.product.itemCode,
        size: sm.variant.size,
        color: sm.variant.color,
        barcode: sm.variant.barcode,
        quantity: sm.quantity,
        unitCost: isAdmin ? unitCost : undefined,
        unitSelling,
        notes: sm.notes,
        createdAt: sm.createdAt,
      };
    });

    // Calculate profit for admin
    let totalCogs = 0;
    const formattedItems = order.items.map((item) => {
      const cogs = Number(item.costPriceSnapshot) * item.quantity;
      totalCogs += cogs;
      const profit = Number(item.netAmount) - cogs;

      return {
        ...item,
        costPriceSnapshot: isAdmin ? Number(item.costPriceSnapshot) : undefined,
        itemProfit: isAdmin ? profit : undefined,
      };
    });

    // Total exchange credit applied to reduce cash payable
    let totalExchangeCredit = 0;
    if (order.returns && order.returns.length > 0) {
      totalExchangeCredit = order.returns.reduce((sum, r) => sum + Number(r.refundAmount), 0);
    }

    // Revenue and profit breakdown:
    // 1. Sold Items Revenue & Margin on sold merchandise
    const soldItemsRevenue = Number(order.subtotal) - Number(order.itemDiscount) - Number(order.billDiscount);
    const soldItemsProfit = soldItemsRevenue - totalCogs;

    // 2. Net Cash vs Net Inventory Cost impact:
    // Cash received = order.netAmount
    // Net Wholesale Cost out = totalCogs (new item) - restockedCost (returned item back in inventory)
    const netCogsChange = totalCogs - restockedCost;
    const netBillProfit = Number(order.netAmount) - netCogsChange;

    return res.json({
      order: {
        ...order,
        items: formattedItems,
        exchangeDetails,
        totalExchangeCredit,
        restockedCost: isAdmin ? restockedCost : undefined,
        totalCogs: isAdmin ? totalCogs : undefined,
        soldItemsProfit: isAdmin ? soldItemsProfit : undefined,
        grossProfit: isAdmin ? soldItemsProfit : undefined,
        netBillProfit: isAdmin ? netBillProfit : undefined,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch order details' });
  }
};

// Sales return handling with stock restock
export const processSalesReturn = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;
    const { items, reason = 'Customer Exchange/Return' } = req.body;
    // items: Array of { orderItemId, productVariantId, quantity, refundAmount }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required for return processing' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot process return on a cancelled order' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let totalRefund = 0;

      for (const item of items) {
        const qty = Number(item.quantity);
        const refundAmt = Number(item.refundAmount);
        totalRefund += refundAmt;

        // Restock returned variant
        const updatedVariant = await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { currentStock: { increment: qty } },
        });

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            productVariantId: item.productVariantId,
            type: 'SALE_RETURN',
            quantity: qty,
            referenceId: order.invoiceNumber,
            balanceAfter: updatedVariant.currentStock,
            notes: `Sales Return from Invoice: ${order.invoiceNumber}. Reason: ${reason}`,
          },
        });
      }

      const returnRecord = await tx.orderReturn.create({
        data: {
          orderId,
          refundAmount: totalRefund,
          reason,
          processedById: userId!,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PARTIALLY_RETURNED' },
      });

      return returnRecord;
    });

    return res.json({
      message: 'Sales return processed and stock restored successfully',
      returnRecord: result,
    });
  } catch (error: any) {
    console.error('Process return error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process return' });
  }
};

// Cancel Order with reason and restock
export const cancelOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Cancellation reason is mandatory for audit records' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Order is already marked cancelled' });
    }

    await prisma.$transaction(async (tx) => {
      // Restock all items
      for (const item of order.items) {
        const updatedVariant = await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { currentStock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productVariantId: item.productVariantId,
            type: 'SALE_RETURN',
            quantity: item.quantity,
            referenceId: order.invoiceNumber,
            balanceAfter: updatedVariant.currentStock,
            notes: `Order Cancelled: ${order.invoiceNumber}. Reason: ${reason.trim()}`,
          },
        });
      }

      await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason.trim(),
        },
      });
    });

    return res.json({ message: 'Order cancelled and stock restored to inventory' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to cancel order' });
  }
};
