import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Boxes,
  AlertTriangle,
  IndianRupee,
  ShoppingBag,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/dashboard'),
      api.get('/reports/best-sellers'),
    ])
      .then(([dashRes, bestRes]) => {
        setSummary(dashRes.data);
        setBestSellers(bestRes.data.bestSellers || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Store Performance Overview
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time sales, gross profit, and stock health metrics
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-400">Current Session</p>
          <p className="text-sm font-bold text-slate-800">{user?.employeeName} ({user?.role})</p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-4 gap-5">
        {/* Today's Sales */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Sales</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">
              ₹{(summary?.todaySales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{summary?.todayOrdersCount || 0} bills completed today</span>
            </p>
          </div>
        </div>

        {/* Gross Profit (Admin only) */}
        {isAdmin ? (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Profit</span>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                ₹{(summary?.todayGrossProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Net Sales minus frozen COGS
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Bills</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">{summary?.todayOrdersCount || 0}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Active salesperson shift</p>
            </div>
          </div>
        )}

        {/* Total Stock In Hand */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock In Hand</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">
              {(summary?.totalStockUnits || 0).toLocaleString('en-IN')} <span className="text-sm font-semibold text-slate-500">units</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Retail Value: ₹{(summary?.stockValuationRetail || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock Alert</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-amber-600">
              {summary?.lowStockCount || 0} <span className="text-sm font-semibold text-slate-500">SKUs</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Require purchase reorder</p>
          </div>
        </div>
      </div>

      {/* Sales Trend Chart & Best Sellers */}
      <div className="grid grid-cols-12 gap-6">
        {/* Sales Chart (8 Cols) */}
        <div className="col-span-8 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">7-Day Sales Trend</h3>
              <p className="text-xs text-slate-500">Daily store turnover</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary?.salesTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Sales']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Best Sellers (4 Cols) */}
        <div className="col-span-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Top Garments</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">By Volume</span>
          </div>

          <div className="space-y-3">
            {bestSellers.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No sales recorded yet.</p>
            ) : (
              bestSellers.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                  <div className="pr-2">
                    <p className="font-bold text-slate-800 line-clamp-1">{item.name}</p>
                    <p className="text-[10px] text-slate-500">{item.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-slate-900">{item.qtySold} sold</span>
                    <p className="text-[10px] text-emerald-600 font-semibold">₹{item.totalRevenue.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
