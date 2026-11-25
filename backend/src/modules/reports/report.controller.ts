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

    let todaySoldQty = 0;
    for (const o of todayOrders) {
      for (const item of o.items) {
        todaySoldQty += item.quantity;
      }
    }

    // Deduct inventory cost and count of returned garments restocked today
    const todayReturns = await prisma.stockMovement.findMany({
      where: {
        createdAt: { gte: startOfToday },
        type: 'SALE_RETURN',
      },
      include: { variant: { select: { costPrice: true } } },
    });

    let todayReturnedQty = 0;
    let todayCogs = 0;
    if (isAdmin) {
      for (const o of todayOrders) {
        for (const item of o.items) {
          todayCogs += Number(item.costPriceSnapshot) * item.quantity;
        }
      }
      for (const ret of todayReturns) {
        todayReturnedQty += ret.quantity;
        todayCogs -= Number(ret.variant.costPrice || 0) * ret.quantity;
      }
    } else {
      for (const ret of todayReturns) {
        todayReturnedQty += ret.quantity;
      }
    }

    todayCogs = Math.max(0, todayCogs);
    const todayGrossProfit = isAdmin ? todaySales - todayCogs : undefined;
    const todayNetSoldQty = Math.max(0, todaySoldQty - todayReturnedQty);

    // Lifetime / All-time store summary for admin
    let allTimeMetrics: any = undefined;
    if (isAdmin) {
      const allOrders = await prisma.order.findMany({
        where: { status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
        include: { items: true },
      });
      let allSoldQty = 0;
      let allRevenue = 0;
      let allCogs = 0;
      for (const o of allOrders) {
        allRevenue += Number(o.netAmount);
        for (const item of o.items) {
          allSoldQty += item.quantity;
          allCogs += Number(item.costPriceSnapshot) * item.quantity;
        }
      }
      const allReturns = await prisma.stockMovement.findMany({
        where: { type: 'SALE_RETURN' },
        include: { variant: { select: { costPrice: true } } },
      });
      let allReturnedQty = 0;
      for (const ret of allReturns) {
        allReturnedQty += ret.quantity;
        allCogs -= Number(ret.variant.costPrice || 0) * ret.quantity;
      }
      allCogs = Math.max(0, allCogs);
      const allGrossProfit = allRevenue - allCogs;
      const allNetSoldQty = Math.max(0, allSoldQty - allReturnedQty);

      allTimeMetrics = {
        totalSoldQty: allNetSoldQty,
        grossSoldQty: allSoldQty,
        returnedQty: allReturnedQty,
        totalRevenue: allRevenue,
        totalCogs: allCogs,
        totalGrossProfit: allGrossProfit,
        grossMarginPercent: allRevenue > 0 ? ((allGrossProfit / allRevenue) * 100).toFixed(1) : '0.0',
        totalOrdersCount: allOrders.length,
      };
    }

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
      todaySoldQty: todayNetSoldQty,
      todayCogs: isAdmin ? todayCogs : undefined,
      todayReturnedQty,
      lowStockCount,
      totalStockUnits,
      stockValuationCost: isAdmin ? totalValuationCost : undefined,
      stockValuationRetail: totalValuationRetail,
      salesTrend,
      allTimeMetrics,
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

export const getStockValuationReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const { categoryId, brandId, search } = req.query;

    const where: any = {
      product: { status: true },
    };

    if (categoryId) {
      where.product.categoryId = String(categoryId);
    }
    if (brandId) {
      where.product.brandId = String(brandId);
    }
    if (search) {
      const s = String(search).trim();
      where.OR = [
        { barcode: { contains: s, mode: 'insensitive' } },
        { product: { name: { contains: s, mode: 'insensitive' } } },
        { product: { itemCode: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const variants = await prisma.productVariant.findMany({
      where,
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
      },
      orderBy: [{ product: { name: 'asc' } }, { size: 'asc' }],
    });

    let totalUnits = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;

    const items = variants.map((v) => {
      const cost = Number(v.costPrice || 0);
      const retail = Number(v.sellingPrice || 0);
      const mrp = Number(v.mrp || 0);
      const stock = v.currentStock;

      const itemTotalCost = cost * stock;
      const itemTotalRetail = retail * stock;
      const itemProfit = itemTotalRetail - itemTotalCost;
      const itemMargin = itemTotalRetail > 0 ? ((itemProfit / itemTotalRetail) * 100).toFixed(1) : '0.0';

      if (stock > 0) {
        totalUnits += stock;
        totalCostValuation += itemTotalCost;
        totalRetailValuation += itemTotalRetail;
      }

      return {
        id: v.id,
        itemCode: v.product.itemCode,
        productName: v.product.name,
        category: v.product.category?.name || 'General',
        brand: v.product.brand?.name || 'In-House',
        size: v.size,
        color: v.color,
        barcode: v.barcode,
        currentStock: stock,
        mrp,
        costPrice: isAdmin ? cost : undefined,
        sellingPrice: retail,
        totalCost: isAdmin ? itemTotalCost : undefined,
        totalRetail: itemTotalRetail,
        projectedProfit: isAdmin ? itemProfit : undefined,
        marginPercent: isAdmin ? `${itemMargin}%` : undefined,
      };
    });

    const totalProjectedProfit = totalRetailValuation - totalCostValuation;
    const overallMargin = totalRetailValuation > 0 ? ((totalProjectedProfit / totalRetailValuation) * 100).toFixed(1) : '0.0';

    return res.json({
      summary: {
        totalSkus: variants.length,
        totalUnits,
        totalCostValuation: isAdmin ? totalCostValuation : undefined,
        totalRetailValuation,
        totalProjectedProfit: isAdmin ? totalProjectedProfit : undefined,
        overallMarginPercent: isAdmin ? `${overallMargin}%` : undefined,
      },
      items,
    });
  } catch (error: any) {
    console.error('Stock valuation report error:', error);
    return res.status(500).json({ error: 'Failed to generate stock valuation report' });
  }
};

export const getDailySalesReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const { date } = req.query;

    const targetDate = date ? new Date(String(date)) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const [orders, returnMovements, expenses] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
        },
        include: {
          customer: true,
          user: { select: { id: true, employeeName: true } },
          items: {
            include: {
              variant: {
                include: { product: { select: { name: true, itemCode: true } } },
              },
            },
          },
          returns: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockMovement.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          type: 'SALE_RETURN',
        },
        include: {
          variant: {
            include: { product: { select: { name: true, itemCode: true } } },
          },
        },
      }),
      prisma.expense.findMany({
        where: {
          expenseDate: { gte: startOfDay, lte: endOfDay },
        },
        include: { category: true, recordedBy: { select: { employeeName: true } } },
      }),
    ]);

    let totalGrossSales = 0;
    let totalDiscounts = 0;
    let netCashCollected = 0;
    let totalCogs = 0;
    let totalQtySold = 0;

    const paymentBreakdown: { [key: string]: number } = { CASH: 0, CARD: 0, UPI: 0, SPLIT: 0 };

    const invoices = orders.map((o) => {
      let orderCogs = 0;
      let orderQty = 0;
      o.items.forEach((it) => {
        orderQty += it.quantity;
        orderCogs += Number(it.costPriceSnapshot) * it.quantity;
      });

      const exchangeCredit = o.returns ? o.returns.reduce((sum, r) => sum + Number(r.refundAmount), 0) : 0;
      const subtotal = Number(o.subtotal);
      const discount = Number(o.itemDiscount) + Number(o.billDiscount);
      const net = Number(o.netAmount);

      totalGrossSales += subtotal;
      totalDiscounts += discount;
      netCashCollected += net;
      totalCogs += orderCogs;
      totalQtySold += orderQty;

      paymentBreakdown[o.paymentMethod] = (paymentBreakdown[o.paymentMethod] || 0) + net;

      // Sale profit on items purchased
      const soldItemsProfit = (subtotal - discount) - orderCogs;

      return {
        id: o.id,
        invoiceNumber: o.invoiceNumber,
        createdAt: o.createdAt,
        customerName: o.customer ? o.customer.name : 'Walk-in Customer',
        customerPhone: o.customer ? o.customer.phone : undefined,
        cashier: o.user.employeeName,
        paymentMethod: o.paymentMethod,
        itemsCount: o.items.length,
        totalQty: orderQty,
        subtotal,
        discount,
        exchangeCredit,
        netAmount: net,
        cogs: isAdmin ? orderCogs : undefined,
        profit: isAdmin ? soldItemsProfit : undefined,
      };
    });

    let restockedCost = 0;
    let restockedQty = 0;
    const returnedItems = returnMovements.map((sm) => {
      const uCost = Number(sm.variant.costPrice || 0);
      const uSelling = Number(sm.variant.sellingPrice || 0);
      restockedCost += uCost * sm.quantity;
      restockedQty += sm.quantity;
      return {
        id: sm.id,
        productName: sm.variant.product.name,
        size: sm.variant.size,
        color: sm.variant.color,
        barcode: sm.variant.barcode,
        quantity: sm.quantity,
        referenceInvoice: sm.referenceId,
        costPrice: isAdmin ? uCost : undefined,
        sellingPrice: uSelling,
        notes: sm.notes,
      };
    });

    // Net COGS = Total Items COGS minus restocked inventory cost
    const netDayCogs = Math.max(0, totalCogs - restockedCost);
    const grossProfit = netCashCollected - netDayCogs;
    const grossMarginPercent = netCashCollected > 0 ? ((grossProfit / netCashCollected) * 100).toFixed(1) : '0.0';

    let totalExpenses = 0;
    expenses.forEach((e) => {
      totalExpenses += Number(e.amount);
    });

    const netOperatingProfit = grossProfit - totalExpenses;

    return res.json({
      date: targetDate.toISOString().split('T')[0],
      summary: {
        totalInvoices: orders.length,
        totalQtySold: Math.max(0, totalQtySold - restockedQty),
        grossPiecesDelivered: totalQtySold,
        piecesRestocked: restockedQty,
        totalGrossSales,
        totalDiscounts,
        netCashCollected,
        totalCogs: isAdmin ? netDayCogs : undefined,
        restockedInventoryValue: isAdmin ? restockedCost : undefined,
        grossProfit: isAdmin ? grossProfit : undefined,
        grossMarginPercent: isAdmin ? `${grossMarginPercent}%` : undefined,
        totalExpenses,
        netOperatingProfit: isAdmin ? netOperatingProfit : undefined,
        paymentBreakdown,
      },
      invoices,
      returnedItems,
      expenses,
    });
  } catch (error: any) {
    console.error('Daily sales report error:', error);
    return res.status(500).json({ error: 'Failed to generate daily sales report' });
  }
};

export const getPeriodicSalesReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const { periodType = 'MONTHLY', year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

    const numYear = parseInt(String(year), 10);
    const numMonth = parseInt(String(month), 10);

    let startDate: Date;
    let endDate: Date;
    let periodTitle: string;

    if (periodType === 'MONTHLY') {
      startDate = new Date(numYear, numMonth - 1, 1, 0, 0, 0, 0);
      endDate = new Date(numYear, numMonth, 0, 23, 59, 59, 999);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      periodTitle = `${monthNames[numMonth - 1]} ${numYear}`;
    } else {
      // YEARLY
      startDate = new Date(numYear, 0, 1, 0, 0, 0, 0);
      endDate = new Date(numYear, 11, 31, 23, 59, 59, 999);
      periodTitle = `Calendar Year ${numYear}`;
    }

    const [orders, returns, expenses] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
        },
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.stockMovement.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          type: 'SALE_RETURN',
        },
        include: { variant: { select: { costPrice: true } } },
      }),
      prisma.expense.findMany({
        where: {
          expenseDate: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Grouping
    const breakdownMap: { [key: string]: { label: string; dateSort: string; billsCount: number; qtySold: number; grossSales: number; discounts: number; netSales: number; cogs: number; expenses: number } } = {};

    if (periodType === 'MONTHLY') {
      const daysInMonth = endDate.getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = String(d).padStart(2, '0');
        const key = `${numYear}-${String(numMonth).padStart(2, '0')}-${dayStr}`;
        breakdownMap[key] = {
          label: `${dayStr}/${String(numMonth).padStart(2, '0')}`,
          dateSort: key,
          billsCount: 0,
          qtySold: 0,
          grossSales: 0,
          discounts: 0,
          netSales: 0,
          cogs: 0,
          expenses: 0,
        };
      }
    } else {
      const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let m = 0; m < 12; m++) {
        const key = `${numYear}-${String(m + 1).padStart(2, '0')}`;
        breakdownMap[key] = {
          label: `${monthShort[m]} ${numYear}`,
          dateSort: key,
          billsCount: 0,
          qtySold: 0,
          grossSales: 0,
          discounts: 0,
          netSales: 0,
          cogs: 0,
          expenses: 0,
        };
      }
    }

    orders.forEach((o) => {
      const dKey = periodType === 'MONTHLY'
        ? o.createdAt.toISOString().split('T')[0]
        : o.createdAt.toISOString().slice(0, 7);

      if (breakdownMap[dKey]) {
        breakdownMap[dKey].billsCount += 1;
        breakdownMap[dKey].grossSales += Number(o.subtotal);
        breakdownMap[dKey].discounts += Number(o.itemDiscount) + Number(o.billDiscount);
        breakdownMap[dKey].netSales += Number(o.netAmount);

        o.items.forEach((it) => {
          breakdownMap[dKey].qtySold += it.quantity;
          breakdownMap[dKey].cogs += Number(it.costPriceSnapshot) * it.quantity;
        });
      }
    });

    returns.forEach((ret) => {
      const dKey = periodType === 'MONTHLY'
        ? ret.createdAt.toISOString().split('T')[0]
        : ret.createdAt.toISOString().slice(0, 7);

      if (breakdownMap[dKey]) {
        breakdownMap[dKey].qtySold -= ret.quantity;
        breakdownMap[dKey].cogs -= Number(ret.variant.costPrice || 0) * ret.quantity;
      }
    });

    expenses.forEach((e) => {
      const dKey = periodType === 'MONTHLY'
        ? e.expenseDate.toISOString().split('T')[0]
        : e.expenseDate.toISOString().slice(0, 7);

      if (breakdownMap[dKey]) {
        breakdownMap[dKey].expenses += Number(e.amount);
      }
    });

    let totalBills = 0;
    let totalQtySold = 0;
    let totalGrossSales = 0;
    let totalDiscounts = 0;
    let totalNetSales = 0;
    let totalCogs = 0;
    let totalExpenses = 0;

    const breakdown = Object.values(breakdownMap).map((row) => {
      row.cogs = Math.max(0, row.cogs);
      row.qtySold = Math.max(0, row.qtySold);
      const grossProfit = row.netSales - row.cogs;
      const netProfit = grossProfit - row.expenses;

      totalBills += row.billsCount;
      totalQtySold += row.qtySold;
      totalGrossSales += row.grossSales;
      totalDiscounts += row.discounts;
      totalNetSales += row.netSales;
      totalCogs += row.cogs;
      totalExpenses += row.expenses;

      return {
        ...row,
        grossProfit: isAdmin ? grossProfit : undefined,
        netProfit: isAdmin ? netProfit : undefined,
        cogs: isAdmin ? row.cogs : undefined,
      };
    });

    const grossProfit = totalNetSales - totalCogs;
    const grossMarginPercent = totalNetSales > 0 ? ((grossProfit / totalNetSales) * 100).toFixed(1) : '0.0';
    const netOperatingProfit = grossProfit - totalExpenses;

    return res.json({
      periodType,
      periodTitle,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      summary: {
        totalBills,
        totalQtySold,
        totalGrossSales,
        totalDiscounts,
        totalNetSales,
        totalCogs: isAdmin ? totalCogs : undefined,
        grossProfit: isAdmin ? grossProfit : undefined,
        grossMarginPercent: isAdmin ? `${grossMarginPercent}%` : undefined,
        totalExpenses,
        netOperatingProfit: isAdmin ? netOperatingProfit : undefined,
      },
      breakdown,
    });
  } catch (error: any) {
    console.error('Periodic sales report error:', error);
    return res.status(500).json({ error: 'Failed to generate periodic sales report' });
  }
};
