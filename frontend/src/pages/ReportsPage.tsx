import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  Download,
  Printer,
  Boxes,
  Receipt,
  RotateCcw,
  ShoppingBag,
  IndianRupee,
  Layers,
  Search,
  Filter,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StoreSettings } from '../types';
import {
  ReportPdfModal,
  ReportPdfColumn,
  ReportPdfSummaryItem,
} from '../components/common/ReportPdfModal';

export const ReportsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'daily' | 'monthly' | 'yearly' | 'stock' | 'profit' | 'sales' | 'products'
  >('daily');

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const todayStr = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [dailyDate, setDailyDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [stockSearch, setStockSearch] = useState<string>('');

  // Date range for P&L and Sales breakdown
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Report Data States
  const [dailyData, setDailyData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [yearlyData, setYearlyData] = useState<any>(null);
  const [stockData, setStockData] = useState<any>(null);
  const [profitReport, setProfitReport] = useState<any>(null);
  const [salesReport, setSalesReport] = useState<any>(null);
  const [bestSellers, setBestSellers] = useState<any[]>([]);

  // PDF Export Modal State
  const [pdfConfig, setPdfConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    columns: ReportPdfColumn[];
    data: any[];
    summaryCards?: ReportPdfSummaryItem[];
    totalsRow?: { [key: string]: string | number };
    orientation?: 'portrait' | 'landscape';
  }>({
    isOpen: false,
    title: '',
    columns: [],
    data: [],
  });

  // Load Settings
  useEffect(() => {
    api.get('/settings').then((res) => setSettings(res.data.settings)).catch(console.error);
  }, []);

  // Fetch report data based on active tab
  const loadReports = async () => {
    try {
      setIsLoading(true);
      if (activeTab === 'daily') {
        const res = await api.get('/reports/daily-sales', { params: { date: dailyDate } });
        setDailyData(res.data);
      } else if (activeTab === 'monthly') {
        const res = await api.get('/reports/periodic-sales', {
          params: { periodType: 'MONTHLY', year: selectedYear, month: selectedMonth },
        });
        setMonthlyData(res.data);
      } else if (activeTab === 'yearly') {
        const res = await api.get('/reports/periodic-sales', {
          params: { periodType: 'YEARLY', year: selectedYear },
        });
        setYearlyData(res.data);
      } else if (activeTab === 'stock') {
        const res = await api.get('/reports/stock-valuation', {
          params: { search: stockSearch.trim() || undefined },
        });
        setStockData(res.data);
      } else if (activeTab === 'profit' && isAdmin) {
        const params = {
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
        };
        const res = await api.get('/reports/profit-loss', { params });
        setProfitReport(res.data);
      } else if (activeTab === 'sales') {
        const params = {
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
        };
        const res = await api.get('/reports/sales', { params });
        setSalesReport(res.data);
      } else if (activeTab === 'products') {
        const res = await api.get('/reports/best-sellers');
        setBestSellers(res.data.bestSellers || []);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [activeTab]);

  // Handle PDF Export for current tab
  const handleExportPdf = () => {
    if (activeTab === 'daily' && dailyData) {
      const summary = dailyData.summary;
      const columns: ReportPdfColumn[] = [
        { header: 'Invoice #', accessor: 'invoiceNumber', bold: true, width: '15%' },
        {
          header: 'Time',
          accessor: (row) =>
            new Date(row.createdAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          width: '12%',
        },
        { header: 'Customer', accessor: 'customerName', width: '20%' },
        { header: 'Qty', accessor: 'totalQty', align: 'center', width: '8%' },
        { header: 'Mode', accessor: 'paymentMethod', align: 'center', width: '10%' },
        {
          header: 'Subtotal',
          accessor: (row) => `₹${Number(row.subtotal).toFixed(2)}`,
          align: 'right',
          width: '11%',
        },
        {
          header: 'Net Collected',
          accessor: (row) => `₹${Number(row.netAmount).toFixed(2)}`,
          align: 'right',
          bold: true,
          width: '12%',
        },
      ];

      if (isAdmin) {
        columns.push(
          {
            header: 'COGS',
            accessor: (row) => `₹${Number(row.cogs || 0).toFixed(2)}`,
            align: 'right',
            width: '10%',
          },
          {
            header: 'Profit',
            accessor: (row) => `₹${Number(row.profit || 0).toFixed(2)}`,
            align: 'right',
            bold: true,
            width: '10%',
          }
        );
      }

      setPdfConfig({
        isOpen: true,
        title: 'DAILY SALES & PROFIT REPORT',
        subtitle: `Date: ${dailyData.date}`,
        orientation: isAdmin ? 'landscape' : 'portrait',
        summaryCards: [
          { label: 'Total Invoices', value: summary.totalInvoices },
          { label: 'Pieces Sold (Net)', value: `${summary.totalQtySold} pcs` },
          { label: 'Net Cash Collected', value: `₹${summary.netCashCollected.toFixed(2)}` },
          ...(isAdmin
            ? [
                { label: 'Wholesale COGS', value: `₹${(summary.totalCogs || 0).toFixed(2)}` },
                {
                  label: 'Net Gross Profit',
                  value: `₹${(summary.grossProfit || 0).toFixed(2)} (${summary.grossMarginPercent || '0%'})`,
                  color: 'text-emerald-700',
                },
              ]
            : []),
        ],
        columns,
        data: dailyData.invoices,
        totalsRow: {
          invoiceNumber: `TOTAL (${summary.totalInvoices} Bills)`,
          totalQty: summary.totalQtySold,
          subtotal: `₹${summary.totalGrossSales.toFixed(2)}`,
          netAmount: `₹${summary.netCashCollected.toFixed(2)}`,
          ...(isAdmin
            ? {
                cogs: `₹${(summary.totalCogs || 0).toFixed(2)}`,
                profit: `₹${(summary.grossProfit || 0).toFixed(2)}`,
              }
            : {}),
        },
      });
    } else if (activeTab === 'monthly' && monthlyData) {
      const summary = monthlyData.summary;
      const columns: ReportPdfColumn[] = [
        { header: 'Date', accessor: 'label', bold: true, width: '15%' },
        { header: 'Bills Punched', accessor: 'billsCount', align: 'center', width: '12%' },
        { header: 'Qty Sold', accessor: 'qtySold', align: 'center', width: '12%' },
        {
          header: 'Gross Sales',
          accessor: (row) => `₹${Number(row.grossSales).toFixed(2)}`,
          align: 'right',
          width: '15%',
        },
        {
          header: 'Net Turnover',
          accessor: (row) => `₹${Number(row.netSales).toFixed(2)}`,
          align: 'right',
          bold: true,
          width: '15%',
        },
      ];

      if (isAdmin) {
        columns.push(
          {
            header: 'COGS',
            accessor: (row) => `₹${Number(row.cogs || 0).toFixed(2)}`,
            align: 'right',
            width: '15%',
          },
          {
            header: 'Gross Profit',
            accessor: (row) => `₹${Number(row.grossProfit || 0).toFixed(2)}`,
            align: 'right',
            bold: true,
            width: '16%',
          }
        );
      }

      setPdfConfig({
        isOpen: true,
        title: 'MONTHLY SALES & PROFIT REPORT',
        subtitle: `Month: ${monthlyData.periodTitle}`,
        orientation: isAdmin ? 'landscape' : 'portrait',
        summaryCards: [
          { label: 'Bills Completed', value: summary.totalBills },
          { label: 'Total Pieces Sold', value: `${summary.totalQtySold} pcs` },
          { label: 'Net Turnover', value: `₹${summary.totalNetSales.toFixed(2)}` },
          ...(isAdmin
            ? [
                { label: 'Wholesale COGS', value: `₹${(summary.totalCogs || 0).toFixed(2)}` },
                {
                  label: 'Gross Profit',
                  value: `₹${(summary.grossProfit || 0).toFixed(2)} (${summary.grossMarginPercent})`,
                  color: 'text-emerald-700',
                },
              ]
            : []),
        ],
        columns,
        data: monthlyData.breakdown.filter((r: any) => r.billsCount > 0 || r.netSales > 0),
        totalsRow: {
          label: 'TOTAL',
          billsCount: summary.totalBills,
          qtySold: summary.totalQtySold,
          grossSales: `₹${summary.totalGrossSales.toFixed(2)}`,
          netSales: `₹${summary.totalNetSales.toFixed(2)}`,
          ...(isAdmin
            ? {
                cogs: `₹${(summary.totalCogs || 0).toFixed(2)}`,
                grossProfit: `₹${(summary.grossProfit || 0).toFixed(2)}`,
              }
            : {}),
        },
      });
    } else if (activeTab === 'yearly' && yearlyData) {
      const summary = yearlyData.summary;
      const columns: ReportPdfColumn[] = [
        { header: 'Month', accessor: 'label', bold: true, width: '18%' },
        { header: 'Bills Count', accessor: 'billsCount', align: 'center', width: '12%' },
        { header: 'Qty Sold', accessor: 'qtySold', align: 'center', width: '12%' },
        {
          header: 'Net Turnover',
          accessor: (row) => `₹${Number(row.netSales).toFixed(2)}`,
          align: 'right',
          bold: true,
          width: '18%',
        },
      ];

      if (isAdmin) {
        columns.push(
          {
            header: 'Wholesale COGS',
            accessor: (row) => `₹${Number(row.cogs || 0).toFixed(2)}`,
            align: 'right',
            width: '18%',
          },
          {
            header: 'Gross Trading Profit',
            accessor: (row) => `₹${Number(row.grossProfit || 0).toFixed(2)}`,
            align: 'right',
            bold: true,
            width: '22%',
          }
        );
      }

      setPdfConfig({
        isOpen: true,
        title: 'ANNUAL / YEARLY SALES & PROFIT STATEMENT',
        subtitle: `Period: ${yearlyData.periodTitle}`,
        orientation: isAdmin ? 'landscape' : 'portrait',
        summaryCards: [
          { label: 'Annual Bills', value: summary.totalBills },
          { label: 'Garments Sold', value: `${summary.totalQtySold} pcs` },
          { label: 'Annual Turnover', value: `₹${summary.totalNetSales.toFixed(2)}` },
          ...(isAdmin
            ? [
                { label: 'Annual COGS', value: `₹${(summary.totalCogs || 0).toFixed(2)}` },
                {
                  label: 'Gross Profit',
                  value: `₹${(summary.grossProfit || 0).toFixed(2)} (${summary.grossMarginPercent})`,
                  color: 'text-emerald-700',
                },
              ]
            : []),
        ],
        columns,
        data: yearlyData.breakdown,
        totalsRow: {
          label: 'ANNUAL TOTAL',
          billsCount: summary.totalBills,
          qtySold: summary.totalQtySold,
          netSales: `₹${summary.totalNetSales.toFixed(2)}`,
          ...(isAdmin
            ? {
                cogs: `₹${(summary.totalCogs || 0).toFixed(2)}`,
                grossProfit: `₹${(summary.grossProfit || 0).toFixed(2)}`,
              }
            : {}),
        },
      });
    } else if (activeTab === 'stock' && stockData) {
      const summary = stockData.summary;
      const columns: ReportPdfColumn[] = [
        { header: 'Style Code', accessor: 'itemCode', bold: true, width: '12%' },
        { header: 'Garment Name', accessor: 'productName', width: '22%' },
        { header: 'Category', accessor: 'category', width: '12%' },
        {
          header: 'Size/Color',
          accessor: (row) => `${row.size} / ${row.color}`,
          align: 'center',
          width: '10%',
        },
        { header: 'Stock', accessor: 'currentStock', align: 'center', bold: true, width: '8%' },
        {
          header: 'Retail Price',
          accessor: (row) => `₹${Number(row.sellingPrice).toFixed(2)}`,
          align: 'right',
          width: '10%',
        },
        {
          header: 'Total Retail',
          accessor: (row) => `₹${Number(row.totalRetail).toFixed(2)}`,
          align: 'right',
          bold: true,
          width: '12%',
        },
      ];

      if (isAdmin) {
        columns.push(
          {
            header: 'Unit Cost',
            accessor: (row) => `₹${Number(row.costPrice || 0).toFixed(2)}`,
            align: 'right',
            width: '10%',
          },
          {
            header: 'Total Cost',
            accessor: (row) => `₹${Number(row.totalCost || 0).toFixed(2)}`,
            align: 'right',
            width: '12%',
          },
          {
            header: 'Projected Profit',
            accessor: (row) => `₹${Number(row.projectedProfit || 0).toFixed(2)} (${row.marginPercent})`,
            align: 'right',
            bold: true,
            width: '14%',
          }
        );
      }

      setPdfConfig({
        isOpen: true,
        title: 'STOCK VALUATION & INVENTORY REPORT',
        subtitle: `Active Garments Count: ${summary.totalSkus} SKUs | Filter: ${stockSearch || 'All Categories'}`,
        orientation: 'landscape',
        summaryCards: [
          { label: 'Active SKUs', value: summary.totalSkus },
          { label: 'Stock in Hand', value: `${summary.totalUnits.toLocaleString('en-IN')} units` },
          {
            label: 'Retail Valuation',
            value: `₹${summary.totalRetailValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          },
          ...(isAdmin
            ? [
                {
                  label: 'Wholesale Cost Basis',
                  value: `₹${(summary.totalCostValuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                },
                {
                  label: 'Projected Margin',
                  value: `₹${(summary.totalProjectedProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${summary.overallMarginPercent})`,
                  color: 'text-emerald-700',
                },
              ]
            : []),
        ],
        columns,
        data: stockData.items,
        totalsRow: {
          itemCode: 'VALUATION TOTAL',
          currentStock: summary.totalUnits,
          totalRetail: `₹${summary.totalRetailValuation.toFixed(2)}`,
          ...(isAdmin
            ? {
                totalCost: `₹${(summary.totalCostValuation || 0).toFixed(2)}`,
                projectedProfit: `₹${(summary.totalProjectedProfit || 0).toFixed(2)}`,
              }
            : {}),
        },
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header & Tabs */}
      <div className="px-8 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Financial & Sales Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade reporting with Cost, Retail, Profit & A4 PDF vector exports
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 flex-wrap gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily Sales
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Sales
          </button>
          <button
            onClick={() => setActiveTab('yearly')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Yearly Statement
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'stock' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock Valuation
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('profit')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'profit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              P&L Statement
            </button>
          )}
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'sales' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sales Modes
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'products' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Best Sellers
          </button>
        </div>
      </div>

      {/* Dynamic Filter Toolbar */}
      <div className="px-8 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        {/* Filters according to active tab */}
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'daily' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-slate-500" />
                Select Date:
              </span>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
              />
              <button
                onClick={loadReports}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Fetch
              </button>
            </div>
          )}

          {activeTab === 'monthly' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
              >
                {[
                  'January',
                  'February',
                  'March',
                  'April',
                  'May',
                  'June',
                  'July',
                  'August',
                  'September',
                  'October',
                  'November',
                  'December',
                ].map((mName, mIdx) => (
                  <option key={mIdx + 1} value={mIdx + 1}>
                    {mName}
                  </option>
                ))}
              </select>

              <span className="font-bold text-slate-600 ml-2">Year:</span>
              <input
                type="number"
                min="2020"
                max="2035"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center"
              />

              <button
                onClick={loadReports}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Fetch
              </button>
            </div>
          )}

          {activeTab === 'yearly' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600">Select Calendar Year:</span>
              <input
                type="number"
                min="2020"
                max="2035"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center"
              />
              <button
                onClick={loadReports}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Fetch
              </button>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="flex items-center gap-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Style, Barcode, Product..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadReports()}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium w-64"
                />
              </div>
              <button
                onClick={loadReports}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Search
              </button>
            </div>
          )}

          {(activeTab === 'profit' || activeTab === 'sales') && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
              />
              <span className="font-bold text-slate-600 ml-1">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
              />
              <button
                onClick={loadReports}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* PDF Export Trigger Button */}
        {['daily', 'monthly', 'yearly', 'stock'].includes(activeTab) && (
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Export / Print PDF</span>
          </button>
        )}
      </div>

      {/* Main Report Body */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* 1. DAILY SALES REPORT */}
        {activeTab === 'daily' && dailyData && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoices</span>
                <p className="text-2xl font-black text-slate-900">{dailyData.summary.totalInvoices}</p>
                <p className="text-xs text-slate-500">Total bills punched</p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pieces Sold</span>
                <p className="text-2xl font-black text-slate-900">
                  {dailyData.summary.totalQtySold} <span className="text-xs font-semibold text-slate-500">pcs</span>
                </p>
                <p className="text-xs text-slate-500">
                  {dailyData.summary.piecesRestocked > 0
                    ? `(${dailyData.summary.piecesRestocked} returned in exchange)`
                    : 'Net delivered pieces'}
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net Cash Collected</span>
                <p className="text-2xl font-black text-slate-900">
                  ₹{Number(dailyData.summary.netCashCollected).toFixed(2)}
                </p>
                <p className="text-xs text-slate-500">Less ₹{Number(dailyData.summary.totalDiscounts).toFixed(2)} discounts</p>
              </div>

              {isAdmin && (
                <>
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Wholesale COGS</span>
                    <p className="text-2xl font-black text-amber-700">
                      ₹{Number(dailyData.summary.totalCogs || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">Net of restocked exchange</p>
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Gross Profit</span>
                    <p className="text-2xl font-black text-emerald-800">
                      ₹{Number(dailyData.summary.grossProfit || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-emerald-700 font-bold">Margin: {dailyData.summary.grossMarginPercent}</p>
                  </div>
                </>
              )}
            </div>

            {/* Invoices Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center justify-between">
                <span>Invoices Punched on {dailyData.date}</span>
                <span className="text-xs font-semibold text-slate-500">{dailyData.invoices.length} Bills</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="pb-2">Invoice #</th>
                      <th className="pb-2">Time</th>
                      <th className="pb-2">Customer</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-center">Payment</th>
                      <th className="pb-2 text-right">Subtotal</th>
                      <th className="pb-2 text-right">Net Payable</th>
                      {isAdmin && <th className="pb-2 text-right">Wholesale Cost</th>}
                      {isAdmin && <th className="pb-2 text-right">Gross Profit</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyData.invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="py-2.5 text-slate-500">
                          {new Date(inv.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 font-medium text-slate-800">{inv.customerName}</td>
                        <td className="py-2.5 text-center font-bold">{inv.totalQty}</td>
                        <td className="py-2.5 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold rounded">
                            {inv.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-medium text-slate-600">
                          ₹{Number(inv.subtotal).toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right font-black text-slate-900 text-sm">
                          ₹{Number(inv.netAmount).toFixed(2)}
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 text-right font-medium text-slate-500">
                            ₹{Number(inv.cogs || 0).toFixed(2)}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="py-2.5 text-right font-bold text-emerald-700">
                            ₹{Number(inv.profit || 0).toFixed(2)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. MONTHLY SALES REPORT */}
        {activeTab === 'monthly' && monthlyData && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Month Bills</span>
                <p className="text-2xl font-black text-slate-900">{monthlyData.summary.totalBills}</p>
                <p className="text-xs text-slate-500">{monthlyData.periodTitle}</p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Garments Sold</span>
                <p className="text-2xl font-black text-slate-900">
                  {monthlyData.summary.totalQtySold} <span className="text-xs font-semibold text-slate-500">pcs</span>
                </p>
                <p className="text-xs text-slate-500">Delivered across the month</p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net Turnover</span>
                <p className="text-2xl font-black text-slate-900">
                  ₹{Number(monthlyData.summary.totalNetSales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-500">Total collected revenue</p>
              </div>

              {isAdmin && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Month Gross Profit</span>
                  <p className="text-2xl font-black text-emerald-800">
                    ₹{Number(monthlyData.summary.grossProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-emerald-700 font-bold">Margin: {monthlyData.summary.grossMarginPercent}</p>
                </div>
              )}
            </div>

            {/* Day by Day Breakdown */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                Daily Breakdown: {monthlyData.periodTitle}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="pb-2">Date</th>
                      <th className="pb-2 text-center">Bills</th>
                      <th className="pb-2 text-center">Qty Sold</th>
                      <th className="pb-2 text-right">Gross Sales</th>
                      <th className="pb-2 text-right">Discounts</th>
                      <th className="pb-2 text-right">Net Turnover</th>
                      {isAdmin && <th className="pb-2 text-right">COGS</th>}
                      {isAdmin && <th className="pb-2 text-right">Gross Profit</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyData.breakdown.map((row: any, idx: number) => (
                      <tr key={idx} className={row.billsCount > 0 ? 'bg-white hover:bg-slate-50' : 'text-slate-400'}>
                        <td className="py-2 font-bold">{row.label}</td>
                        <td className="py-2 text-center font-semibold">{row.billsCount}</td>
                        <td className="py-2 text-center font-bold">{row.qtySold}</td>
                        <td className="py-2 text-right">₹{Number(row.grossSales).toFixed(2)}</td>
                        <td className="py-2 text-right text-rose-600">-₹{Number(row.discounts).toFixed(2)}</td>
                        <td className="py-2 text-right font-black text-slate-900">
                          ₹{Number(row.netSales).toFixed(2)}
                        </td>
                        {isAdmin && (
                          <td className="py-2 text-right text-slate-500">₹{Number(row.cogs || 0).toFixed(2)}</td>
                        )}
                        {isAdmin && (
                          <td className="py-2 text-right font-bold text-emerald-700">
                            ₹{Number(row.grossProfit || 0).toFixed(2)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. YEARLY REPORT */}
        {activeTab === 'yearly' && yearlyData && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Year Bills</span>
                <p className="text-2xl font-black text-slate-900">{yearlyData.summary.totalBills}</p>
                <p className="text-xs text-slate-500">{yearlyData.periodTitle}</p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Garments Sold</span>
                <p className="text-2xl font-black text-slate-900">
                  {yearlyData.summary.totalQtySold} <span className="text-xs font-semibold text-slate-500">pcs</span>
                </p>
                <p className="text-xs text-slate-500">Annual volume</p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Annual Turnover</span>
                <p className="text-2xl font-black text-slate-900">
                  ₹{Number(yearlyData.summary.totalNetSales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-500">Net revenue</p>
              </div>

              {isAdmin && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Annual Gross Profit</span>
                  <p className="text-2xl font-black text-emerald-800">
                    ₹{Number(yearlyData.summary.grossProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-emerald-700 font-bold">Margin: {yearlyData.summary.grossMarginPercent}</p>
                </div>
              )}
            </div>

            {/* Month by Month Breakdown */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                Monthly Breakdown: {yearlyData.periodTitle}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="pb-2">Month</th>
                      <th className="pb-2 text-center">Bills Punched</th>
                      <th className="pb-2 text-center">Qty Sold</th>
                      <th className="pb-2 text-right">Net Sales Turnover</th>
                      {isAdmin && <th className="pb-2 text-right">Wholesale COGS</th>}
                      {isAdmin && <th className="pb-2 text-right">Gross Trading Profit</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yearlyData.breakdown.map((row: any, idx: number) => (
                      <tr key={idx} className={row.billsCount > 0 ? 'bg-white hover:bg-slate-50' : 'text-slate-400'}>
                        <td className="py-2.5 font-bold text-slate-900">{row.label}</td>
                        <td className="py-2.5 text-center font-semibold">{row.billsCount}</td>
                        <td className="py-2.5 text-center font-bold">{row.qtySold}</td>
                        <td className="py-2.5 text-right font-black text-slate-900">
                          ₹{Number(row.netSales).toFixed(2)}
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 text-right text-slate-500">₹{Number(row.cogs || 0).toFixed(2)}</td>
                        )}
                        {isAdmin && (
                          <td className="py-2.5 text-right font-bold text-emerald-700">
                            ₹{Number(row.grossProfit || 0).toFixed(2)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. STOCK VALUATION REPORT */}
        {activeTab === 'stock' && stockData && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active SKUs</span>
                <p className="text-2xl font-black text-slate-900">{stockData.summary.totalSkus}</p>
                <p className="text-xs text-slate-500">Product variants</p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Physical Stock</span>
                <p className="text-2xl font-black text-slate-900">
                  {stockData.summary.totalUnits.toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-semibold text-slate-500">units</span>
                </p>
                <p className="text-xs text-slate-500">Garments in hand</p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Retail Realization</span>
                <p className="text-2xl font-black text-slate-900">
                  ₹{Number(stockData.summary.totalRetailValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-500">Selling price value</p>
              </div>

              {isAdmin && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Wholesale Cost Basis</span>
                  <p className="text-2xl font-black text-emerald-800">
                    ₹{Number(stockData.summary.totalCostValuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-emerald-700 font-bold">
                    Projected Profit: ₹{Number(stockData.summary.totalProjectedProfit || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              )}
            </div>

            {/* Detailed Stock Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Variant-Level Inventory Valuation
                </h3>
                <span className="text-xs font-semibold text-slate-500">{stockData.items.length} Variants</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="pb-2">Style Code</th>
                      <th className="pb-2">Garment Description</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2 text-center">Size / Color</th>
                      <th className="pb-2 text-center">Current Qty</th>
                      <th className="pb-2 text-right">Selling Price</th>
                      <th className="pb-2 text-right">Total Retail</th>
                      {isAdmin && <th className="pb-2 text-right">Unit Cost</th>}
                      {isAdmin && <th className="pb-2 text-right">Total Cost</th>}
                      {isAdmin && <th className="pb-2 text-right">Margin</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockData.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 font-mono font-bold text-slate-900">{item.itemCode}</td>
                        <td className="py-2.5 font-bold text-slate-800">{item.productName}</td>
                        <td className="py-2.5 text-slate-600">{item.category}</td>
                        <td className="py-2.5 text-center text-slate-700 font-medium">
                          {item.size} / {item.color}
                        </td>
                        <td className="py-2.5 text-center font-black text-slate-900">{item.currentStock}</td>
                        <td className="py-2.5 text-right font-medium text-slate-700">
                          ₹{Number(item.sellingPrice).toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right font-bold text-slate-900">
                          ₹{Number(item.totalRetail).toFixed(2)}
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 text-right text-slate-500">
                            ₹{Number(item.costPrice || 0).toFixed(2)}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="py-2.5 text-right font-bold text-amber-900">
                            ₹{Number(item.totalCost || 0).toFixed(2)}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="py-2.5 text-right font-bold text-emerald-700">
                            ₹{Number(item.projectedProfit || 0).toFixed(2)} ({item.marginPercent})
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. PROFIT & LOSS STATEMENT */}
        {activeTab === 'profit' && profitReport && (
          <div className="max-w-4xl mx-auto space-y-6">
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
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">Gross Sales Revenue:</span>
                  <span className="font-bold text-slate-900">
                    ₹{profitReport.statement.grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-100 text-rose-600">
                  <span>Less: Total Discounts Given:</span>
                  <span className="font-semibold">
                    -₹{profitReport.statement.totalDiscounts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between py-3 border-y border-slate-200 bg-slate-50 px-3 rounded-xl font-bold">
                  <span className="text-slate-800">Net Sales:</span>
                  <span className="text-slate-900">
                    ₹{profitReport.statement.netSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-100 text-amber-700">
                  <span>Less: Cost of Goods Sold (COGS net of returned goods):</span>
                  <span className="font-semibold">
                    -₹{profitReport.statement.costOfGoodsSold.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between py-3 border-y border-emerald-200 bg-emerald-50 px-3 rounded-xl font-bold text-emerald-900">
                  <span>Gross Trading Profit ({profitReport.statement.grossMarginPercent} margin):</span>
                  <span className="text-lg font-black">
                    ₹{profitReport.statement.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-100 text-rose-600">
                  <span>Less: Total Operating Store Expenses:</span>
                  <span className="font-semibold">
                    -₹{profitReport.statement.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

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

        {/* 6. SALES BREAKDOWN */}
        {activeTab === 'sales' && salesReport && (
          <div className="max-w-4xl mx-auto space-y-6">
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

        {/* 7. BEST SELLERS */}
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

      {/* PDF Export Modal */}
      <ReportPdfModal
        isOpen={pdfConfig.isOpen}
        onClose={() => setPdfConfig((prev) => ({ ...prev, isOpen: false }))}
        title={pdfConfig.title}
        subtitle={pdfConfig.subtitle}
        settings={settings}
        generatedBy={user ? `${user.employeeName} (${user.role})` : 'Administrator'}
        summaryCards={pdfConfig.summaryCards}
        columns={pdfConfig.columns}
        data={pdfConfig.data}
        totalsRow={pdfConfig.totalsRow}
        orientation={pdfConfig.orientation}
      />
    </div>
  );
};
