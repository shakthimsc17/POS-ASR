import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthenticatedRequest } from '../../middleware/auth';

export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Today's orders
    const todayOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfToday },
        status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
      },
      include: { items: true },
    });

    const todaySales = todayOrders.reduce((sum, o) => sum + Number(o.netAmount), 0);
    const todayOrdersCount = todayOrders.length;

    let todayCogs = 0;
    if (isAdmin) {
      for (const o of todayOrders) {
        for (const item of o.items) {
          todayCogs += Number(item.costPriceSnapshot) * item.quantity;
        }
      }
      // Deduct inventory cost of returned garments restocked today
      const todayReturns = await prisma.stockMovement.findMany({
        where: {
          createdAt: { gte: startOfToday },
          type: 'SALE_RETURN',
        },
        include: { variant: { select: { costPrice: true } } },
      });
      for (const ret of todayReturns) {
        todayCogs -= Number(ret.variant.costPrice || 0) * ret.quantity;
      }
    }
    const todayGrossProfit = isAdmin ? todaySales - Math.max(0, todayCogs) : undefined;

    // 2. Low stock count
    const lowStockCount = await prisma.productVariant.count({
      where: { currentStock: { lte: 5 } },
    });

    // 3. Stock valuation
    const allVariants = await prisma.productVariant.findMany({
      select: { currentStock: true, costPrice: true, sellingPrice: true },
    });

    let totalStockUnits = 0;
    let totalValuationCost = 0;
    let totalValuationRetail = 0;

    for (const v of allVariants) {
      if (v.currentStock > 0) {
        totalStockUnits += v.currentStock;
        totalValuationCost += Number(v.costPrice) * v.currentStock;
        totalValuationRetail += Number(v.sellingPrice) * v.currentStock;
      }
    }

    // 4. Last 7 days sales trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const pastOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
      },
      select: { createdAt: true, netAmount: true },
    });

    // Group by date (YYYY-MM-DD)
    const salesByDayMap: { [key: string]: number } = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      salesByDayMap[key] = 0;
    }

    pastOrders.forEach((o) => {
      const dayKey = o.createdAt.toISOString().split('T')[0];
      if (salesByDayMap[dayKey] !== undefined) {
        salesByDayMap[dayKey] += Number(o.netAmount);
      }
    });

    const salesTrend = Object.keys(salesByDayMap).map((date) => ({
      date,
      sales: salesByDayMap[date],
    }));

    return res.json({
      todaySales,
      todayOrdersCount,
      todayGrossProfit,
      lowStockCount,
      totalStockUnits,
      stockValuationCost: isAdmin ? totalValuationCost : undefined,
      stockValuationRetail: totalValuationRetail,
      salesTrend,
    });
  } catch (error: any) {
    console.error('Dashboard summary error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
};

export const getSalesReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, paymentMethod, employeeId } = req.query;

    const where: any = {
      status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (employeeId) where.userId = String(employeeId);

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, employeeName: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let grossSales = 0;
    let totalItemDiscounts = 0;
    let totalBillDiscounts = 0;
    let totalTax = 0;
    let netSales = 0;

    const paymentBreakdown: { [key: string]: number } = {
      CASH: 0,
      CARD: 0,
      UPI: 0,
      SPLIT: 0,
    };

    const employeeSales: { [key: string]: { name: string; total: number; count: number } } = {};

    orders.forEach((o) => {
      grossSales += Number(o.subtotal);
      totalItemDiscounts += Number(o.itemDiscount);
      totalBillDiscounts += Number(o.billDiscount);
      totalTax += Number(o.taxAmount);
      netSales += Number(o.netAmount);

      paymentBreakdown[o.paymentMethod] = (paymentBreakdown[o.paymentMethod] || 0) + Number(o.netAmount);

      const empId = o.user.id;
      if (!employeeSales[empId]) {
        employeeSales[empId] = { name: o.user.employeeName, total: 0, count: 0 };
      }
      employeeSales[empId].total += Number(o.netAmount);
      employeeSales[empId].count += 1;
    });

    return res.json({
      summary: {
        totalOrders: orders.length,
        grossSales,
        totalDiscounts: totalItemDiscounts + totalBillDiscounts,
        totalTax,
        netSales,
      },
      paymentBreakdown,
      employeeBreakdown: Object.values(employeeSales),
      orders,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to generate sales report' });
  }
};

export const getProfitLossReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const orderWhere: any = {
      status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
    };
    const expenseWhere: any = {};

    if (startDate || endDate) {
      orderWhere.createdAt = {};
      expenseWhere.expenseDate = {};
      if (startDate) {
        orderWhere.createdAt.gte = new Date(String(startDate));
        expenseWhere.expenseDate.gte = new Date(String(startDate));
      }
      if (endDate) {
        orderWhere.createdAt.lte = new Date(String(endDate));
        expenseWhere.expenseDate.lte = new Date(String(endDate));
      }
    }

    const [orders, expenses] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        include: { items: true },
      }),
      prisma.expense.findMany({
        where: expenseWhere,
        include: { category: true },
      }),
    ]);

    let grossSales = 0;
    let totalDiscounts = 0;
    let netSales = 0;
    let cogs = 0;

    orders.forEach((o) => {
      grossSales += Number(o.subtotal);
      totalDiscounts += Number(o.itemDiscount) + Number(o.billDiscount);
      netSales += Number(o.netAmount);

      o.items.forEach((item) => {
        cogs += Number(item.costPriceSnapshot) * item.quantity;
      });
    });

    // Deduct restocked inventory cost from COGS during this period
    const periodReturns = await prisma.stockMovement.findMany({
      where: {
        createdAt: {
          ...(startDate && { gte: new Date(String(startDate)) }),
          ...(endDate && { lte: new Date(String(endDate)) }),
        },
        type: 'SALE_RETURN',
      },
      include: { variant: { select: { costPrice: true } } },
    });
    for (const ret of periodReturns) {
      cogs -= Number(ret.variant.costPrice || 0) * ret.quantity;
    }
    cogs = Math.max(0, cogs);

    const grossProfit = netSales - cogs;
    const grossMarginPercent = netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(2) : '0.00';

    let totalExpenses = 0;
    const expenseBreakdown: { [key: string]: number } = {};

    expenses.forEach((e) => {
      const amt = Number(e.amount);
      totalExpenses += amt;
      const catName = e.category.name;
      expenseBreakdown[catName] = (expenseBreakdown[catName] || 0) + amt;
    });

    const netOperatingProfit = grossProfit - totalExpenses;
    const netProfitMarginPercent = netSales > 0 ? ((netOperatingProfit / netSales) * 100).toFixed(2) : '0.00';

    return res.json({
      statement: {
        grossSales,
        totalDiscounts,
        netSales,
        costOfGoodsSold: cogs,
        grossProfit,
        grossMarginPercent: `${grossMarginPercent}%`,
        totalExpenses,
        netOperatingProfit,
        netProfitMarginPercent: `${netProfitMarginPercent}%`,
      },
      expenseBreakdown,
      orderCount: orders.length,
      expenseCount: expenses.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to generate profit and loss statement' });
  }
};

export const getBestSellingProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.orderItem.findMany({
      where: {
        order: { status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
      },
      include: {
        variant: {
          include: {
            product: { include: { category: true } },
          },
        },
      },
    });

    const productMap: { [key: string]: { name: string; itemCode: string; category: string; qtySold: number; totalRevenue: number } } = {};

    items.forEach((item) => {
      const prod = item.variant.product;
      if (!productMap[prod.id]) {
        productMap[prod.id] = {
          name: prod.name,
          itemCode: prod.itemCode,
          category: prod.category.name,
          qtySold: 0,
          totalRevenue: 0,
        };
      }
      productMap[prod.id].qtySold += item.quantity;
      productMap[prod.id].totalRevenue += Number(item.netAmount);
    });

    const ranked = Object.values(productMap).sort((a, b) => b.qtySold - a.qtySold).slice(0, 15);

    return res.json({ bestSellers: ranked });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch best sellers' });
  }
};
