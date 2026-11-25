import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthenticatedRequest } from '../../middleware/auth';

export const getStockOverview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filter, search, page = '1', limit = '25' } = req.query;
    const isAdmin = req.user?.role === 'ADMIN';

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 25;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      const s = String(search).trim();
      where.OR = [
        { barcode: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
        { product: { name: { contains: s, mode: 'insensitive' } } },
        { product: { itemCode: { contains: s, mode: 'insensitive' } } },
      ];
    }

    if (filter === 'OUT_OF_STOCK') {
      where.currentStock = { lte: 0 };
    }

    const [total, variants] = await Promise.all([
      prisma.productVariant.count({ where }),
      prisma.productVariant.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          product: {
            include: { category: true, brand: true },
          },
        },
        orderBy: [{ currentStock: 'asc' }],
      }),
    ]);

    const formatted = variants.map((v) => {
      const isLow = v.currentStock <= v.lowStockThreshold && v.currentStock > 0;
      const isOut = v.currentStock <= 0;
      return {
        id: v.id,
        productId: v.productId,
        productName: v.product.name,
        itemCode: v.product.itemCode,
        category: v.product.category.name,
        brand: v.product.brand?.name,
        size: v.size,
        color: v.color,
        sku: v.sku,
        barcode: v.barcode,
        currentStock: v.currentStock,
        lowStockThreshold: v.lowStockThreshold,
        stockStatus: isOut ? 'OUT_OF_STOCK' : isLow ? 'LOW_STOCK' : 'IN_STOCK',
        sellingPrice: Number(v.sellingPrice),
        costPrice: isAdmin ? Number(v.costPrice) : undefined,
        stockValuationCost: isAdmin ? Number(v.costPrice) * v.currentStock : undefined,
        stockValuationRetail: Number(v.sellingPrice) * v.currentStock,
      };
    });

    return res.json({
      stock: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch stock overview' });
  }
};

export const getLowStockAlerts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const variants = await prisma.productVariant.findMany({
      where: {
        currentStock: { lte: 5 }, // default threshold filter
      },
      include: {
        product: { select: { name: true, itemCode: true } },
      },
      orderBy: { currentStock: 'asc' },
      take: 50,
    });

    return res.json({
      lowStockItems: variants.map((v) => ({
        variantId: v.id,
        name: v.product.name,
        itemCode: v.product.itemCode,
        size: v.size,
        color: v.color,
        barcode: v.barcode,
        currentStock: v.currentStock,
        lowStockThreshold: v.lowStockThreshold,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch low stock alerts' });
  }
};

export const listStockMovements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { variantId, type, search, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (variantId) {
      where.productVariantId = String(variantId);
    }

    if (type && type !== 'ALL') {
      where.type = String(type);
    }

    if (search) {
      const s = String(search).trim();
      where.OR = [
        { referenceId: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
        { variant: { barcode: { contains: s, mode: 'insensitive' } } },
        { variant: { product: { name: { contains: s, mode: 'insensitive' } } } },
        { variant: { product: { itemCode: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, itemCode: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formattedMovements = movements.map((m) => {
      const previousBalance = m.balanceAfter - m.quantity;
      return {
        ...m,
        previousBalance,
      };
    });

    return res.json({
      movements: formattedMovements,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
};

export const createStockAdjustment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { reason, items } = req.body;
    // items: Array of { productVariantId, adjustedStock }

    if (!reason || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Reason and adjusted items are required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const adjustment = await tx.stockAdjustment.create({
        data: {
          reason: reason.trim(),
          authorizedById: userId!,
        },
      });

      for (const item of items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.productVariantId },
        });

        if (!variant) continue;

        const previousStock = variant.currentStock;
        const newStock = Number(item.adjustedStock);
        const diff = newStock - previousStock;

        // Save adjustment item
        await tx.stockAdjustmentItem.create({
          data: {
            adjustmentId: adjustment.id,
            productVariantId: item.productVariantId,
            previousStock,
            adjustedStock: newStock,
            differenceQty: diff,
          },
        });

        // Update variant current stock
        await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { currentStock: newStock },
        });

        // Record stock movement ledger
        await tx.stockMovement.create({
          data: {
            productVariantId: item.productVariantId,
            type: diff < 0 ? 'DAMAGE_ADJUSTMENT' : 'AUDIT_CORRECTION',
            quantity: diff,
            referenceId: adjustment.id,
            balanceAfter: newStock,
            notes: `Stock Adjustment: ${reason.trim()}`,
          },
        });
      }

      return tx.stockAdjustment.findUnique({
        where: { id: adjustment.id },
        include: { items: true },
      });
    });

    return res.status(201).json({
      message: 'Stock adjustment applied successfully',
      adjustment: result,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to apply stock adjustment' });
  }
};
