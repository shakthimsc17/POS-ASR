import React, { useState, useEffect } from 'react';
import { Boxes, AlertTriangle, History, Wrench, Search, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const InventoryPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'movements' | 'adjustments'>('overview');

  const [stockList, setStockList] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Stock Adjustment State
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [newStockCount, setNewStockCount] = useState('');
  const [adjustReason, setAdjustReason] = useState('Damaged / Soiled in Store');

  const loadStock = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/inventory/overview', {
        params: { search: search.trim() || undefined, filter: filter || undefined },
      });
      setStockList(res.data.stock || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      const res = await api.get('/inventory/movements');
      setMovements(res.data.movements || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') loadStock();
    if (activeTab === 'movements') loadMovements();
  }, [activeTab, filter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'overview') loadStock();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId || newStockCount === '') {
      alert('Please select a garment and enter the physical count');
      return;
    }

    try {
      await api.post('/inventory/adjustments', {
        reason: adjustReason,
        items: [
          {
            productVariantId: selectedVariantId,
            adjustedStock: parseInt(newStockCount, 10),
          },
        ],
      });

      alert('Stock adjustment saved and logged in audit history!');
      setSelectedVariantId('');
      setNewStockCount('');
      loadStock();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to adjust stock');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header & Tabs */}
      <div className="px-8 py-5 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inventory Management & Stock Audits</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time stock valuation, reorder thresholds, and double-entry movement history
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Stock Overview
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'movements' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Movement Audit Logs
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('adjustments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'adjustments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Stock Adjustment
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <>
          <div className="px-8 py-4 flex items-center gap-4 bg-slate-100 border-b border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by garment name, SKU, or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="">All Stock Levels</option>
              <option value="OUT_OF_STOCK">Out of Stock Only</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Barcode / SKU</th>
                    <th className="py-3 px-4">Garment Master</th>
                    <th className="py-3 px-4">Size & Color</th>
                    <th className="py-3 px-4 text-center">Available Stock</th>
                    <th className="py-3 px-4 text-center">Health Status</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Cost Value</th>}
                    <th className="py-3 px-4 text-right">Retail Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {stockList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.barcode}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{item.productName}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">{item.size}</span>
                        <span className="text-slate-500 ml-1">({item.color})</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-sm text-slate-900">
                        {item.currentStock}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.stockStatus === 'IN_STOCK'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.stockStatus === 'LOW_STOCK'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {item.stockStatus.replace('_', ' ')}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right font-medium text-slate-600">
                          ₹{(item.stockValuationCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{(item.stockValuationRetail || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Movements Log */}
      {activeTab === 'movements' && (
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Garment</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-center">Units Changed</th>
                  <th className="py-3 px-4 text-center">Balance After</th>
                  <th className="py-3 px-4">Audit Memo / Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-500">
                      {new Date(m.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {m.variant?.product?.name} ({m.variant?.size} / {m.variant?.color})
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-slate-800">{m.type}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold">
                      <span className={m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-900">{m.balanceAfter}</td>
                    <td className="py-2.5 px-4 text-slate-600 text-[11px]">{m.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Adjustments */}
      {activeTab === 'adjustments' && (
        <div className="flex-1 p-8 max-w-xl">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900">Perform Physical Stock Adjustment</h3>
            <p className="text-xs text-slate-500">
              Audit corrections for damaged goods, soiled display pieces, or physical tally differences
            </p>

            <form onSubmit={handleApplyAdjustment} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Garment SKU *</label>
                <select
                  required
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="">Select Garment</option>
                  {stockList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.productName} ({s.size} / {s.color}) — Currently on system: {s.currentStock}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Verified Shelf Count *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newStockCount}
                  onChange={(e) => setNewStockCount(e.target.value)}
                  placeholder="e.g. 8"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Audit Reason *</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
                >
                  <option value="Damaged / Soiled in Store">Damaged / Soiled in Store</option>
                  <option value="Physical Shelf Tally Discrepancy">Physical Shelf Tally Discrepancy</option>
                  <option value="Customer Try-Room Loss / Missing">Customer Try-Room Loss / Missing</option>
                  <option value="Sample Taken by Management">Sample Taken by Management</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                Save Adjustment & Update Audit Ledger
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
