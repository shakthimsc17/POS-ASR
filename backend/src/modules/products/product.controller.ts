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
      defaultDiscount: Number(v.defaultDiscount || 0),
      currentStock: v.currentStock,
      gstRate: Number(v.product.gstRate),
      costPrice: isAdmin ? Number(v.costPrice) : undefined,
    }));

    return res.json({ results });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to execute quick search' });
  }
};

// Download sample CSV template pre-filled with real textile garments
export const downloadSampleCsv = async (req: Request, res: Response) => {
  const headers = 'item_code,product_name,category,subcategory,brand,size,color,cost_price,mrp,selling_price,default_discount_pct,stock_quantity,barcode\n';
  const sampleRows = [
    'SHT-101,Cotton Formal Shirt,Men,Shirts,ASRTEX Cotton,38,White,420,999,799,10,15,890123456701',
    'SHT-101,Cotton Formal Shirt,Men,Shirts,ASRTEX Cotton,40,White,420,999,799,10,20,890123456702',
    'SHT-101,Cotton Formal Shirt,Men,Shirts,ASRTEX Cotton,42,Sky Blue,440,999,799,0,12,',
    'SAR-201,Kanchipuram Art Silk Saree,Women,Sarees,Manyavar,Free Size,Maroon & Gold,1250,2999,2499,15,10,890123456705',
    'SAR-201,Kanchipuram Art Silk Saree,Women,Sarees,Manyavar,Free Size,Peacock Green,1250,2999,2499,15,7,',
    'PNT-301,Men Slim Fit Chinos,Men,Pants & Trousers,Raymond,32,Khaki,550,1499,1199,5,18,',
    'KRT-401,Rayon Printed Anarkali Kurti,Women,Kurtis & Tops,Pothys Choice,M,Navy Blue,320,899,699,0,25,'
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="textile_items_sample.csv"');
  return res.status(200).send(headers + sampleRows);
};

// Bulk import products and variants from CSV data
export const importProductsCsv = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided for import' });
    }

    const results = await prisma.$transaction(async (tx) => {
      let createdProductsCount = 0;
      let createdVariantsCount = 0;
      let updatedVariantsCount = 0;

      const categoryMap = new Map<string, string>();
      const brandMap = new Map<string, string>();

      for (let i = 0; i < items.length; i++) {
        const row = items[i];
        const itemCode = String(row.item_code || row.itemCode || '').trim().toUpperCase();
        const productName = String(row.product_name || row.productName || '').trim();
        const categoryName = String(row.category || '').trim();
        const subcategoryName = String(row.subcategory || '').trim();
        const brandName = String(row.brand || '').trim();
        const size = String(row.size || 'Free Size').trim();
        const color = String(row.color || 'Standard').trim();
        const costPrice = parseFloat(row.cost_price || row.costPrice) || 0;
        const mrp = parseFloat(row.mrp) || 0;
        const sellingPrice = parseFloat(row.selling_price || row.sellingPrice) || mrp || 0;
        const defaultDiscount = parseFloat(row.default_discount_pct || row.defaultDiscount) || 0;
        const stockQty = parseInt(row.stock_quantity || row.stockQuantity, 10) || 0;
        let barcode = String(row.barcode || '').trim();

        if (!itemCode || !productName || !categoryName) {
          throw new Error(`Row ${i + 1}: item_code, product_name, and category are required`);
        }

        // 1. Resolve Category
        let categoryId: string;
        const catKey = subcategoryName ? `${categoryName}>${subcategoryName}` : categoryName;
        if (categoryMap.has(catKey)) {
          categoryId = categoryMap.get(catKey)!;
        } else {
          let parent = await tx.category.findUnique({ where: { name: categoryName } });
          if (!parent) {
            parent = await tx.category.create({ data: { name: categoryName } });
          }

          if (subcategoryName) {
            let sub = await tx.category.findUnique({ where: { name: subcategoryName } });
            if (!sub) {
              sub = await tx.category.create({ data: { name: subcategoryName, parentId: parent.id } });
            } else if (!sub.parentId) {
              sub = await tx.category.update({ where: { id: sub.id }, data: { parentId: parent.id } });
            }
            categoryId = sub.id;
          } else {
            categoryId = parent.id;
          }
          categoryMap.set(catKey, categoryId);
        }

        // 2. Resolve Brand
        let brandId: string | null = null;
        if (brandName) {
          if (brandMap.has(brandName)) {
            brandId = brandMap.get(brandName)!;
          } else {
            let brand = await tx.brand.findUnique({ where: { name: brandName } });
            if (!brand) {
              brand = await tx.brand.create({ data: { name: brandName } });
            }
            brandId = brand.id;
            brandMap.set(brandName, brandId);
          }
        }

        // 3. Upsert Product Master
        let product = await tx.product.findUnique({ where: { itemCode } });
        if (!product) {
          product = await tx.product.create({
            data: {
              itemCode,
              name: productName,
              categoryId,
              brandId,
              status: true,
            },
          });
          createdProductsCount++;
        }

        // 4. Barcode resolution
        if (!barcode) {
          barcode = `${Math.floor(100000000000 + Math.random() * 900000000000)}`;
        }

        const sku = `${itemCode}-${size}-${color}`.replace(/\s+/g, '').toUpperCase();

        const existingVariant = await tx.productVariant.findFirst({
          where: {
            OR: [
              { barcode },
              { AND: [{ productId: product.id }, { size }, { color }] },
            ],
          },
        });

        if (existingVariant) {
          const updated = await tx.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              currentStock: { increment: stockQty },
              costPrice: costPrice > 0 ? costPrice : existingVariant.costPrice,
              mrp: mrp > 0 ? mrp : existingVariant.mrp,
              sellingPrice: sellingPrice > 0 ? sellingPrice : existingVariant.sellingPrice,
              defaultDiscount,
            },
          });
          updatedVariantsCount++;

          if (stockQty > 0) {
            await tx.stockMovement.create({
              data: {
                productVariantId: updated.id,
                type: 'AUDIT_CORRECTION',
                quantity: stockQty,
                balanceAfter: updated.currentStock,
                notes: `Bulk CSV Stock Inward (+${stockQty})`,
              },
            });
          }
        } else {
          const newVariant = await tx.productVariant.create({
            data: {
              productId: product.id,
              size,
              color,
              sku,
              barcode,
              costPrice,
              mrp,
              sellingPrice,
              defaultDiscount,
              currentStock: stockQty,
              lowStockThreshold: 3,
            },
          });
          createdVariantsCount++;

          if (stockQty > 0) {
            await tx.stockMovement.create({
              data: {
                productVariantId: newVariant.id,
                type: 'AUDIT_CORRECTION',
                quantity: stockQty,
                balanceAfter: stockQty,
                notes: 'Opening stock via Bulk CSV Import',
              },
            });
          }
        }
      }

      return {
        createdProductsCount,
        createdVariantsCount,
        updatedVariantsCount,
        totalProcessed: items.length,
      };
    });

    return res.status(201).json({
      message: `Import successful: Processed ${results.totalProcessed} garments (${results.createdVariantsCount} new, ${results.updatedVariantsCount} updated).`,
      results,
    });
  } catch (error: any) {
    console.error('CSV import error:', error);
    return res.status(500).json({ error: error.message || 'Failed to import products from CSV' });
  }
};
