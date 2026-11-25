import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  History,
  Wrench,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  ShoppingBag,
  Truck,
  RefreshCw,
  ArrowRight,
  FileText,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VariantStockHistoryModal } from '../components/common/VariantStockHistoryModal';

export const InventoryPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'movements' | 'adjustments'>('overview');

  const [stockList, setStockList] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Movements Filter State
  const [movementSearch, setMovementSearch] = useState('');
  const [movementType, setMovementType] = useState('ALL');
  const [isMovementsLoading, setIsMovementsLoading] = useState(false);

  // Per-Variant History Modal
  const [selectedHistoryVariant, setSelectedHistoryVariant] = useState<any | null>(null);

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
      setIsMovementsLoading(true);
      const res = await api.get('/inventory/movements', {
        params: {
          search: movementSearch.trim() || undefined,
          type: movementType !== 'ALL' ? movementType : undefined,
          limit: 100,
        },
      });
      setMovements(res.data.movements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsMovementsLoading(false);
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

  useEffect(() => {
    if (activeTab === 'movements') {
      const timer = setTimeout(loadMovements, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, movementSearch, movementType]);

  const renderMovementBadge = (type: string) => {
    switch (type) {
      case 'SALE_RETURN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <RotateCcw className="w-3 h-3 text-emerald-700" />
            🔄 Exchange / Return (+ Restock)
          </span>
        );
      case 'SALE_DEDUCTION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
            <ShoppingBag className="w-3 h-3 text-blue-700" />
            🛒 Counter Sale (- Deducted)
          </span>
        );
      case 'PURCHASE_RECEIPT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-300">
            <Truck className="w-3 h-3 text-teal-700" />
            📦 Supplier Inward (+ Inward)
          </span>
        );
      case 'DAMAGE_ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-700" />
            ⚠️ Damaged / Quarantine
          </span>
        );
      case 'AUDIT_CORRECTION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-300">
            <FileText className="w-3 h-3 text-slate-700" />
            ✏️ Count Correction
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

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
                    <th className="py-3 px-4 text-center">Audit History</th>
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
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedHistoryVariant(item)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
                          title="Inspect lifetime stock movements for this size/color"
                        >
                          <History className="w-3.5 h-3.5 text-emerald-600" />
                          Ledger
                        </button>
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
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Audit Filter Toolbar */}
          <div className="px-8 py-3.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by Bill #, Barcode, Product Name, or Notes..."
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {movementSearch && (
                <button
                  onClick={() => setMovementSearch('')}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
                {[
                  { id: 'ALL', label: 'All Movements' },
                  { id: 'SALE_RETURN', label: '🔄 Returns & Exchanges' },
                  { id: 'SALE_DEDUCTION', label: '🛒 Counter Sales' },
                  { id: 'PURCHASE_RECEIPT', label: '📦 Inward Bills' },
                  { id: 'DAMAGE_ADJUSTMENT', label: '⚠️ Adjustments' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setMovementType(t.id)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      movementType === t.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <button
                onClick={loadMovements}
                disabled={isMovementsLoading}
                className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-600 hover:text-emerald-700 transition-colors shadow-sm"
                title="Refresh audit log"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isMovementsLoading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Garment Master & Barcode</th>
                    <th className="py-3 px-4">Movement Action</th>
                    <th className="py-3 px-4 text-center">Stock Flow Calculation</th>
                    <th className="py-3 px-4 text-center">Final Balance</th>
                    <th className="py-3 px-4">Invoice / Audit Memo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No stock movements found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => {
                      const prevStock = m.previousBalance !== undefined ? m.previousBalance : m.balanceAfter - m.quantity;
                      const isPositive = m.quantity > 0;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </td>

                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{m.variant?.product?.name}</p>
                            <p className="text-[11px] text-slate-500">
                              Size: <span className="font-semibold text-slate-700">{m.variant?.size}</span> • Color:{' '}
                              <span className="font-semibold text-slate-700">{m.variant?.color}</span>
                              {m.variant?.barcode && (
                                <span className="font-mono text-slate-400 ml-1.5 text-[10px]">({m.variant?.barcode})</span>
                              )}
                            </p>
                          </td>

                          <td className="py-3 px-4">
                            {renderMovementBadge(m.type)}
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                              <span className="font-bold text-slate-600 px-1.5 py-0.5 bg-slate-100 rounded">
                                {prevStock}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span
                                className={`px-2 py-0.5 rounded font-black ${
                                  isPositive
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isPositive ? `+${m.quantity}` : m.quantity}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="font-black text-slate-900 px-1.5 py-0.5 bg-slate-200 rounded">
                                {m.balanceAfter}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center font-black text-slate-900 text-sm">
                            {m.balanceAfter}
                          </td>

                          <td className="py-3 px-4 text-slate-700">
                            {m.referenceId && (
                              <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-800 font-mono text-[10px] font-bold rounded mr-1.5 border border-slate-200">
                                {m.referenceId}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-600">{m.notes}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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
      {/* Per-Variant Lifetime Stock History Ledger Modal */}
      <VariantStockHistoryModal
        isOpen={Boolean(selectedHistoryVariant)}
        onClose={() => setSelectedHistoryVariant(null)}
        variant={selectedHistoryVariant}
      />
    </div>
  );
};
