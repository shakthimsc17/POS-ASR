import { Request, Response } from 'express';
import prisma from '../../config/prisma';

export const listCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: { select: { id: true, name: true } },
        subCategories: { select: { id: true, name: true, status: true } },
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ categories });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, parentId, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const cleanName = name.trim();
    const existing = await prisma.category.findUnique({
      where: { name: cleanName },
    });

    if (existing) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const category = await prisma.category.create({
      data: {
        name: cleanName,
        parentId: parentId || null,
        status: status !== undefined ? Boolean(status) : true,
      },
    });

    return res.status(201).json({ message: 'Category created successfully', category });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create category' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, parentId, status } = req.body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Prevent making a category its own parent
    if (parentId && parentId === id) {
      return res.status(400).json({ error: 'A category cannot be its own parent' });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        parentId: parentId !== undefined ? (parentId || null) : existing.parentId,
        status: status !== undefined ? Boolean(status) : existing.status,
      },
    });

    return res.json({ message: 'Category updated successfully', category: updated });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update category' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category: ${productCount} products are associated with it. Please reassign or deactivate it instead.`,
      });
    }

    await prisma.category.delete({ where: { id } });
    return res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete category' });
  }
};

// Brands support
export const listBrands = async (req: Request, res: Response) => {
  try {
    const brands = await prisma.brand.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    return res.json({ brands });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch brands' });
  }
};

export const createBrand = async (req: Request, res: Response) => {
  try {
    const { name, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Brand name is required' });
    }
    const cleanName = name.trim();
    const existing = await prisma.brand.findUnique({ where: { name: cleanName } });
    if (existing) {
      return res.status(400).json({ error: 'Brand already exists' });
    }
    const brand = await prisma.brand.create({
      data: { name: cleanName, status: status !== undefined ? Boolean(status) : true },
    });
    return res.status(201).json({ message: 'Brand created successfully', brand });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create brand' });
  }
};
