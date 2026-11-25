import React, { useState, useEffect } from 'react';
import { X, History, RotateCcw, ShoppingBag, Truck, AlertTriangle, FileText, Loader2, ArrowRight } from 'lucide-react';
import api from '../../services/api';

interface VariantInfo {
  id: string;
  productName?: string;
  itemCode?: string;
  size: string;
  color: string;
  barcode?: string;
  currentStock: number;
}

interface VariantStockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: VariantInfo | null;
}

export const VariantStockHistoryModal: React.FC<VariantStockHistoryModalProps> = ({
  isOpen,
  onClose,
  variant,
}) => {
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && variant?.id) {
      loadHistory();
    } else {
      setMovements([]);
    }
  }, [isOpen, variant]);

  const loadHistory = async () => {
    if (!variant?.id) return;
    try {
      setIsLoading(true);
      const res = await api.get('/inventory/movements', {
        params: { variantId: variant.id, limit: 100 },
      });
      setMovements(res.data.movements || []);
    } catch (err) {
      console.error('Failed to load variant stock movements', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !variant) return null;

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
            ✏️ Stock Count Correction
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  {variant.productName || 'Garment'} — Stock Audit Ledger
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 font-black text-xs rounded-full">
                  Current Stock: {variant.currentStock} units
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Size: <span className="font-bold text-slate-200">{variant.size}</span> • Color:{' '}
                <span className="font-bold text-slate-200">{variant.color}</span>
                {variant.barcode && (
                  <span className="font-mono text-slate-300 ml-2">Barcode: {variant.barcode}</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs font-semibold">Loading stock audit trail...</p>
            </div>
          ) : movements.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-8">
              <History className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-50" />
              <p className="text-sm font-bold text-slate-700">No stock movements recorded yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Purchases, billing sales, returns, and exchanges will be logged here chronologically.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4 text-center">Stock Flow Calculation</th>
                    <th className="py-3 px-4 text-center">Final Balance</th>
                    <th className="py-3 px-4">Invoice / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((m) => {
                    const prevStock = m.previousBalance !== undefined ? m.previousBalance : m.balanceAfter - m.quantity;
                    const isPositive = m.quantity > 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </td>

                        <td className="py-3 px-4">{renderMovementBadge(m.type)}</td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                            <span className="font-bold text-slate-600 px-1.5 py-0.5 bg-slate-100 rounded">
                              {prevStock}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span
                              className={`px-1.5 py-0.5 rounded font-black ${
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
                            <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-800 font-mono text-[10px] font-bold rounded mr-1.5">
                              {m.referenceId}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-600">{m.notes}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {movements.length} audit entries</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
