import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Calendar,
  Filter,
  Download,
  IndianRupee,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ReportsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'sales' | 'profit' | 'products'>('profit');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Report States
  const [salesReport, setSalesReport] = useState<any>(null);
  const [profitReport, setProfitReport] = useState<any>(null);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const params = {
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      };

      if (activeTab === 'sales') {
        const res = await api.get('/reports/sales', { params });
        setSalesReport(res.data);
      } else if (activeTab === 'profit' && isAdmin) {
        const res = await api.get('/reports/profit-loss', { params });
        setProfitReport(res.data);
      } else if (activeTab === 'products') {
        const res = await api.get('/reports/best-sellers');
        setBestSellers(res.data.bestSellers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [activeTab]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header & Tabs */}
      <div className="px-8 py-5 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Financial Reports & Profit Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade computation of Net Operating Profit, COGS, and sales distribution
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          {isAdmin && (
            <button
              onClick={() => setActiveTab('profit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'profit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Profit & Loss (P&L)
            </button>
          )}
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'sales' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Sales Breakdown
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'products' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Best-Selling Garments
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="px-8 py-4 bg-slate-100 border-b border-slate-200 flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-600">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-600">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
          />
        </div>
        <button
          onClick={loadReports}
          className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors"
        >
          Apply Filters
        </button>
      </div>

      {/* Main Report Body */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* TAB 1: PROFIT & LOSS STATEMENT */}
        {activeTab === 'profit' && profitReport && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Statement Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="border-b border-slate-200 pb-4 mb-6">
                <h3 className="text-lg font-extrabold text-slate-900 uppercase tracking-wider">
                  Store Income & Profit Statement
                </h3>
                <p className="text-xs text-slate-500">
                  Formula: Gross Profit = Net Sales - COGS | Net Operating Profit = Gross Profit - Expenses
                </p>
              </div>

              <div className="space-y-4 text-sm">
                {/* 1. Gross Sales */}
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">Gross Sales Revenue:</span>
                  <span className="font-bold text-slate-900">
                    ₹{profitReport.statement.grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 2. Discounts */}
                <div className="flex justify-between py-2 border-b border-slate-100 text-rose-600">
                  <span>Less: Total Discounts Given:</span>
                  <span className="font-semibold">
                    -₹{profitReport.statement.totalDiscounts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 3. Net Sales */}
                <div className="flex justify-between py-3 border-y border-slate-200 bg-slate-50 px-3 rounded-xl font-bold">
                  <span className="text-slate-800">Net Sales:</span>
                  <span className="text-slate-900">
                    ₹{profitReport.statement.netSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 4. COGS */}
                <div className="flex justify-between py-2 border-b border-slate-100 text-amber-700">
                  <span>Less: Cost of Goods Sold (COGS at sale snapshot):</span>
                  <span className="font-semibold">
                    -₹{profitReport.statement.costOfGoodsSold.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 5. Gross Profit */}
                <div className="flex justify-between py-3 border-y border-emerald-200 bg-emerald-50 px-3 rounded-xl font-bold text-emerald-900">
                  <span>Gross Trading Profit ({profitReport.statement.grossMarginPercent} margin):</span>
                  <span className="text-lg font-black">
                    ₹{profitReport.statement.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 6. Expenses */}
                <div className="flex justify-between py-2 border-b border-slate-100 text-rose-600">
                  <span>Less: Total Operating Store Expenses:</span>
                  <span className="font-semibold">
                    -₹{profitReport.statement.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 7. Net Operating Profit */}
                <div className="flex justify-between py-4 border-2 border-emerald-500 bg-emerald-100/60 px-4 rounded-2xl font-black text-slate-900">
                  <div className="flex flex-col">
                    <span className="text-base text-emerald-950">NET OPERATING PROFIT</span>
                    <span className="text-xs font-semibold text-emerald-800">
                      Margin: {profitReport.statement.netProfitMarginPercent}
                    </span>
                  </div>
                  <span className="text-3xl text-emerald-900">
                    ₹{profitReport.statement.netOperatingProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SALES BREAKDOWN */}
        {activeTab === 'sales' && salesReport && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Payment Method Cards */}
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(salesReport.paymentBreakdown).map(([mode, val]: any) => (
                <div key={mode} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase">{mode} Sales</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-1">
                    ₹{Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>

            {/* Sales by Salesperson */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Sales by Employee</h3>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="pb-2">Salesperson</th>
                    <th className="pb-2 text-center">Bills Punched</th>
                    <th className="pb-2 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesReport.employeeBreakdown.map((emp: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2.5 font-bold text-slate-900">{emp.name}</td>
                      <td className="py-2.5 text-center font-semibold text-slate-700">{emp.count}</td>
                      <td className="py-2.5 text-right font-black text-emerald-700 text-sm">
                        ₹{Number(emp.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: BEST SELLERS */}
        {activeTab === 'products' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Fast-Moving Garment Styles</h3>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="pb-2">Style Code</th>
                    <th className="pb-2">Garment Name</th>
                    <th className="pb-2">Category</th>
                    <th className="pb-2 text-center">Total Qty Sold</th>
                    <th className="pb-2 text-right">Total Turnover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bestSellers.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 font-mono font-bold text-slate-900">{item.itemCode}</td>
                      <td className="py-2.5 font-bold text-slate-800">{item.name}</td>
                      <td className="py-2.5 text-slate-600">{item.category}</td>
                      <td className="py-2.5 text-center font-bold text-slate-900">{item.qtySold}</td>
                      <td className="py-2.5 text-right font-black text-slate-900">
                        ₹{Number(item.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
