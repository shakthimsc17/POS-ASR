import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { AuthenticatedRequest } from '../../middleware/auth';

// Helper to sanitize variant according to role
const formatVariant = (variant: any, isAdmin: boolean) => {
  const cost = Number(variant.costPrice);
  const selling = Number(variant.sellingPrice);
  const mrp = Number(variant.mrp);
  const marginAmount = selling - cost;
  const marginPercentage = selling > 0 ? ((marginAmount / selling) * 100).toFixed(2) : '0.00';

  return {
    ...variant,
    costPrice: isAdmin ? cost : undefined,
    mrp,
    sellingPrice: selling,
    defaultDiscount: Number(variant.defaultDiscount),
    marginAmount: isAdmin ? marginAmount : undefined,
    marginPercentage: isAdmin ? `${marginPercentage}%` : undefined,
  };
};

export const listProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const { search, categoryId, status, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      const s = String(search).trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { itemCode: { contains: s, mode: 'insensitive' } },
        { variants: { some: { barcode: { contains: s, mode: 'insensitive' } } } },
        { variants: { some: { sku: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    if (categoryId) {
      where.categoryId = String(categoryId);
    }

    if (status !== undefined) {
      where.status = status === 'true';
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          variants: {
            orderBy: [{ size: 'asc' }, { color: 'asc' }],
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formattedProducts = products.map((prod) => ({
      ...prod,
      gstRate: Number(prod.gstRate),
      totalStock: prod.variants.reduce((sum, v) => sum + v.currentStock, 0),
      variants: prod.variants.map((v) => formatVariant(v, isAdmin)),
    }));

    return res.json({
      products: formattedProducts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('List products error:', error);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getProductById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user?.role === 'ADMIN';

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        variants: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json({
      product: {
        ...product,
        gstRate: Number(product.gstRate),
        variants: product.variants.map((v) => formatVariant(v, isAdmin)),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch product details' });
  }
};

export const createProductWithVariants = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      itemCode,
      name,
      description,
      categoryId,
      brandId,
      hsnCode,
      gstRate = 5.0,
      variants, // Array of { size, color, sku, barcode, costPrice, mrp, sellingPrice, defaultDiscount, currentStock, lowStockThreshold }
    } = req.body;

    if (!itemCode || !name || !categoryId) {
      return res.status(400).json({ error: 'Item code, name, and category are required' });
    }

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ error: 'At least one variant (Size & Color) is required for apparel products' });
    }

    const cleanItemCode = itemCode.trim().toUpperCase();
    const existing = await prisma.product.findUnique({ where: { itemCode: cleanItemCode } });
    if (existing) {
      return res.status(400).json({ error: `Product code '${cleanItemCode}' already exists` });
    }

    // Use transaction to create product and its variants atomically
    const newProduct = await prisma.$transaction(async (tx) => {
      const createdProd = await tx.product.create({
        data: {
          itemCode: cleanItemCode,
          name: name.trim(),
          description: description ? description.trim() : null,
          categoryId,
          brandId: brandId || null,
          hsnCode: hsnCode ? hsnCode.trim() : null,
          gstRate,
        },
      });

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const barcode = v.barcode ? v.barcode.trim() : `${cleanItemCode}-${Date.now()}-${i}`;
        const sku = v.sku ? v.sku.trim() : `${cleanItemCode}-${v.size}-${v.color}`.replace(/\s+/g, '').toUpperCase();
        const initialStock = Number(v.currentStock) || 0;

        const createdVariant = await tx.productVariant.create({
          data: {
            productId: createdProd.id,
            size: v.size.trim(),
            color: v.color.trim(),
            sku,
            barcode,
            costPrice: v.costPrice,
            mrp: v.mrp,
            sellingPrice: v.sellingPrice,
            defaultDiscount: v.defaultDiscount || 0,
            currentStock: initialStock,
            lowStockThreshold: v.lowStockThreshold || 3,
          },
        });

        // Record initial stock movement if stock > 0
        if (initialStock > 0) {
          await tx.stockMovement.create({
            data: {
              productVariantId: createdVariant.id,
              type: 'AUDIT_CORRECTION',
              quantity: initialStock,
              balanceAfter: initialStock,
              notes: 'Initial opening stock upon product creation',
            },
          });
        }
      }

      return tx.product.findUnique({
        where: { id: createdProd.id },
        include: { variants: true, category: true, brand: true },
      });
    });

    return res.status(201).json({
      message: 'Product and variants created successfully',
      product: newProduct,
    });
  } catch (error: any) {
    console.error('Create product error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Duplicate barcode or SKU detected across inventory' });
    }
    return res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, categoryId, brandId, hsnCode, gstRate, status, variants } = req.body;

    const existing = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: name ? name.trim() : existing.name,
          description: description !== undefined ? description : existing.description,
          categoryId: categoryId || existing.categoryId,
          brandId: brandId !== undefined ? (brandId || null) : existing.brandId,
          hsnCode: hsnCode !== undefined ? hsnCode : existing.hsnCode,
          gstRate: gstRate !== undefined ? gstRate : existing.gstRate,
          status: status !== undefined ? Boolean(status) : existing.status,
        },
      });

      if (variants && Array.isArray(variants)) {
        for (const v of variants) {
          if (v.id) {
            // Update existing variant
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                size: v.size,
                color: v.color,
                barcode: v.barcode,
                costPrice: v.costPrice,
                mrp: v.mrp,
                sellingPrice: v.sellingPrice,
                defaultDiscount: v.defaultDiscount,
                lowStockThreshold: v.lowStockThreshold,
              },
            });
          } else {
            // Add new variant to existing product
            await tx.productVariant.create({
              data: {
                productId: id,
                size: v.size,
                color: v.color,
                sku: v.sku || `${existing.itemCode}-${v.size}-${v.color}`.replace(/\s+/g, '').toUpperCase(),
                barcode: v.barcode || `${existing.itemCode}-${Date.now()}`,
                costPrice: v.costPrice,
                mrp: v.mrp,
                sellingPrice: v.sellingPrice,
                defaultDiscount: v.defaultDiscount || 0,
                currentStock: v.currentStock || 0,
                lowStockThreshold: v.lowStockThreshold || 3,
              },
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: { variants: true, category: true, brand: true },
      });
    });

    return res.json({ message: 'Product updated successfully', product: updated });
  } catch (error: any) {
    console.error('Update product error:', error);
    return res.status(500).json({ error: 'Failed to update product' });
  }
};

// Fast barcode scanner lookup for POS
export const getVariantByBarcode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { barcode } = req.params;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!barcode) {
      return res.status(400).json({ error: 'Barcode parameter is required' });
    }

    const cleanBarcode = barcode.trim();

    const variant = await prisma.productVariant.findUnique({
      where: { barcode: cleanBarcode },
      include: {
        product: {
          include: { category: true, brand: true },
        },
      },
    });

    if (!variant) {
      return res.status(404).json({ error: `No garment found with barcode: ${cleanBarcode}` });
    }

    if (!variant.product.status) {
      return res.status(400).json({ error: 'This product has been marked inactive' });
    }

    return res.json({
      variant: formatVariant(variant, isAdmin),
      productName: variant.product.name,
      itemCode: variant.product.itemCode,
      gstRate: Number(variant.product.gstRate),
      categoryName: variant.product.category.name,
    });
  } catch (error: any) {
    console.error('Barcode lookup error:', error);
    return res.status(500).json({ error: 'Failed to find variant by barcode' });
  }
};

// Quick search for POS item search bar
export const searchProductsQuick = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q } = req.query;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!q || String(q).trim().length === 0) {
      return res.json({ results: [] });
    }

    const query = String(q).trim();

    const variants = await prisma.productVariant.findMany({
      where: {
        product: { status: true },
        OR: [
          { barcode: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { product: { name: { contains: query, mode: 'insensitive' } } },
          { product: { itemCode: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: {
        product: {
          select: { id: true, name: true, itemCode: true, gstRate: true },
        },
      },
      take: 20,
    });

    const results = variants.map((v) => ({
      variantId: v.id,
      productId: v.productId,
      productName: v.product.name,
      itemCode: v.product.itemCode,
      size: v.size,
      color: v.color,
      barcode: v.barcode,
      sku: v.sku,
      sellingPrice: Number(v.sellingPrice),
      mrp: Number(v.mrp),
      currentStock: v.currentStock,
      gstRate: Number(v.product.gstRate),
      costPrice: isAdmin ? Number(v.costPrice) : undefined,
    }));

    return res.json({ results });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to execute quick search' });
  }
};
