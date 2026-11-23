import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthenticatedRequest } from '../../middleware/auth';

export const listExpenseCategories = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ categories });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch expense categories' });
  }
};

export const createExpenseCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const cleanName = name.trim();
    const existing = await prisma.expenseCategory.findUnique({ where: { name: cleanName } });
    if (existing) {
      return res.status(400).json({ error: 'Expense category already exists' });
    }
    const category = await prisma.expenseCategory.create({ data: { name: cleanName } });
    return res.status(201).json({ message: 'Category created', category });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create category' });
  }
};

export const listExpenses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categoryId, startDate, endDate, page = '1', limit = '30' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 30;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (categoryId) {
      where.categoryId = String(categoryId);
    }
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(String(startDate));
      if (endDate) where.expenseDate.lte = new Date(String(endDate));
    }

    const [total, expenses, sumAggregate] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          category: true,
          recordedBy: { select: { id: true, employeeName: true } },
        },
        orderBy: { expenseDate: 'desc' },
      }),
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    return res.json({
      expenses,
      totalAmount: sumAggregate._sum.amount ? Number(sumAggregate._sum.amount) : 0,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

export const createExpense = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, categoryId, amount, expenseDate, paymentType = 'CASH', notes } = req.body;

    if (!name || !categoryId || !amount) {
      return res.status(400).json({ error: 'Expense name, category, and amount are required' });
    }

    const amt = Number(amount);
    if (amt <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const expense = await prisma.expense.create({
      data: {
        name: name.trim(),
        categoryId,
        amount: amt,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paymentType,
        notes: notes ? notes.trim() : null,
        recordedById: userId!,
      },
      include: {
        category: true,
        recordedBy: { select: { id: true, employeeName: true } },
      },
    });

    return res.status(201).json({ message: 'Expense recorded successfully', expense });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to record expense' });
  }
};
