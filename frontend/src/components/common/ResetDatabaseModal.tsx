import React, { useState } from 'react';
import { AlertTriangle, Trash2, CheckCircle2, X, RefreshCw, ShieldAlert } from 'lucide-react';
import api from '../../services/api';

interface ResetDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScope?: 'TRANSACTIONS_ONLY' | 'FULL_WIPE';
  onSuccess?: () => void;
}

export const ResetDatabaseModal: React.FC<ResetDatabaseModalProps> = ({
  isOpen,
  onClose,
  initialScope = 'TRANSACTIONS_ONLY',
  onSuccess,
}) => {
  const [resetScope, setResetScope] = useState<'TRANSACTIONS_ONLY' | 'FULL_WIPE'>(initialScope);
  const [startingInvoiceNumber, setStartingInvoiceNumber] = useState<number>(1001);
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isConfirmed = confirmationPhrase.trim() === 'RESET-ASRTEX';

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setErrorMsg('');
    setIsResetting(true);

    try {
      const res = await api.post('/settings/reset-database', {
        resetScope,
        startingInvoiceNumber,
        confirmationPhrase: confirmationPhrase.trim(),
      });

      alert(res.data.message || 'Database reset successfully!');
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Reset database failed:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to reset database. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col border border-rose-200">
        {/* Header */}
        <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
            <div>
              <h3 className="font-extrabold text-base leading-none">Danger Zone: Store Data Reset</h3>
              <p className="text-[11px] text-rose-100 mt-0.5">Go-Live Database Initialization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isResetting}
            className="text-rose-200 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleExecuteReset} className="p-6 space-y-5 text-slate-800">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              1. Select Reset Scope:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setResetScope('TRANSACTIONS_ONLY')}
                className={`p-3 rounded-2xl border-2 text-left transition-all ${
                  resetScope === 'TRANSACTIONS_ONLY'
                    ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-extrabold text-xs text-amber-900">
                  Wipe Orders Only
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  Clears test sales & expenses. <strong>Preserves products, variants, & categories.</strong>
                </p>
              </button>

              <button
                type="button"
                onClick={() => setResetScope('FULL_WIPE')}
                className={`p-3 rounded-2xl border-2 text-left transition-all ${
                  resetScope === 'FULL_WIPE'
                    ? 'border-rose-600 bg-rose-50/70 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-extrabold text-xs text-rose-900">
                  Factory Reset (Clean Slate)
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  Wipes test products, categories, purchases, & orders. <strong>Fresh for real CSV import.</strong>
                </p>
              </button>
            </div>
          </div>

          {/* Data Impact Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Impact Summary for {resetScope === 'FULL_WIPE' ? 'Factory Clean Slate' : 'Orders Only Reset'}:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="space-y-1">
                <span className="font-bold text-rose-700 block">🗑️ Will Be Permanently Deleted:</span>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  <li>All Sales Bills & Orders</li>
                  <li>Customer Payment Logs</li>
                  <li>Purchases & Stock Adjustments</li>
                  <li>Recorded Expenses</li>
                  {resetScope === 'FULL_WIPE' && <li>All Products & Categories</li>}
                </ul>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-emerald-700 block">🔒 Will Be Safely Preserved:</span>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  <li>Admin Account & Login</li>
                  <li>ATPOS & Seznik Printer Configs</li>
                  <li>Store Name, Address, & GSTIN</li>
                  {resetScope === 'TRANSACTIONS_ONLY' && <li>Product Masters & Barcodes</li>}
                </ul>
              </div>
            </div>
          </div>

          {/* Starting Invoice Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              2. Starting Invoice Number for Real Sales:
            </label>
            <input
              type="number"
              min="1"
              value={startingInvoiceNumber}
              onChange={(e) => setStartingInvoiceNumber(parseInt(e.target.value, 10) || 1001)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-rose-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              The next sale will start as <strong>ASR-{startingInvoiceNumber}</strong>
            </p>
          </div>

          {/* Prompt Confirmation Gate */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              3. Security Confirmation: Type <span className="font-mono font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">RESET-ASRTEX</span> to unlock:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Type RESET-ASRTEX"
                value={confirmationPhrase}
                onChange={(e) => setConfirmationPhrase(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl text-xs font-bold font-mono tracking-wider focus:border-rose-500 uppercase"
              />
              {isConfirmed && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 absolute right-3 top-2.5" />
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isResetting}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isResetting}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 text-white shadow-md transition-all ${
                isConfirmed && !isResetting
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30 cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed shadow-none'
              }`}
            >
              {isResetting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Wiping Data...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Permanently Reset Database
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
