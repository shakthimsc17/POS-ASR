import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthenticatedRequest } from '../../middleware/auth';

// Suppliers
export const listSuppliers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: { _count: { select: { purchases: true } } },
      orderBy: { name: 'asc' },
    });
    return res.json({ suppliers });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

export const createSupplier = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, contactPerson, phone, email, gstin, address } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Supplier name and phone are required' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactPerson: contactPerson ? contactPerson.trim() : null,
        phone: phone.trim(),
        email: email ? email.trim() : null,
        gstin: gstin ? gstin.trim() : null,
        address: address ? address.trim() : null,
      },
    });

    return res.status(201).json({ message: 'Supplier created successfully', supplier });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create supplier' });
  }
};

// Purchases
export const listPurchases = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const purchases = await prisma.purchase.findMany({
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        receivedBy: { select: { id: true, employeeName: true } },
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, name: true, itemCode: true } },
              },
            },
          },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    return res.json({ purchases });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch purchases' });
  }
};

export const createPurchaseEntry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { supplierId, purchaseInvoice, purchaseDate, notes, items } = req.body;
    // items: Array of { productVariantId, quantity, costPricePerUnit }

    if (!supplierId || !purchaseInvoice || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Supplier, invoice number, and at least one purchased item are required',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;

      for (const item of items) {
        const qty = Number(item.quantity);
        const cost = Number(item.costPricePerUnit);
        if (qty <= 0 || cost < 0) {
          throw new Error('Quantity must be greater than zero and cost price cannot be negative');
        }
        totalAmount += qty * cost;
      }

      const purchase = await tx.purchase.create({
        data: {
          purchaseInvoice: purchaseInvoice.trim(),
          supplierId,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          totalAmount,
          notes: notes ? notes.trim() : null,
          receivedById: userId,
        },
      });

      for (const item of items) {
        const qty = Number(item.quantity);
        const cost = Number(item.costPricePerUnit);
        const lineTotal = qty * cost;

        // Save purchase item
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productVariantId: item.productVariantId,
            quantity: qty,
            costPricePerUnit: cost,
            totalCost: lineTotal,
          },
        });

        // Increment stock and update latest cost price
        const updatedVariant = await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: {
            currentStock: { increment: qty },
            costPrice: cost,
          },
        });

        // Record stock movement ledger
        await tx.stockMovement.create({
          data: {
            productVariantId: item.productVariantId,
            type: 'PURCHASE_RECEIPT',
            quantity: qty,
            referenceId: purchase.id,
            balanceAfter: updatedVariant.currentStock,
            notes: `Purchase Inward Bill: ${purchaseInvoice}`,
          },
        });
      }

      return tx.purchase.findUnique({
        where: { id: purchase.id },
        include: { supplier: true, items: true },
      });
    });

    return res.status(201).json({
      message: 'Purchase recorded and stock incremented successfully',
      purchase: result,
    });
  } catch (error: any) {
    console.error('Purchase entry error:', error);
    return res.status(500).json({ error: error.message || 'Failed to record purchase' });
  }
};
