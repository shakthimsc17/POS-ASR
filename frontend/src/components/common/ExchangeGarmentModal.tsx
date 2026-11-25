import React, { useState, useRef, useEffect } from 'react';
import { X, RotateCcw, Search, Barcode, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';

export interface ExchangedGarment {
  variantId: string;
  productName: string;
  size: string;
  color: string;
  barcode: string;
  quantity: number;
  creditAmount: number;
  reason?: string;
}

interface ExchangeGarmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExchange: (item: ExchangedGarment) => void;
}

export const ExchangeGarmentModal: React.FC<ExchangeGarmentModalProps> = ({
  isOpen,
  onClose,
  onApplyExchange,
}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [reason, setReason] = useState('Customer Size / Style Exchange');
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
      setQuery('');
      setSearchResults([]);
      setSelectedVariant(null);
      setQuantity(1);
      setCreditAmount('');
      setReason('Customer Size / Style Exchange');
      setError(null);
    }
  }, [isOpen]);

  // Search by barcode or text
  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;

    try {
      setIsSearching(true);
      setError(null);

      // Try barcode first
      try {
        const barRes = await api.get(`/products/variant/barcode/${encodeURIComponent(q)}`);
        if (barRes.data?.variant) {
          handleSelectVariant({
            ...barRes.data.variant,
            productName: barRes.data.productName,
          });
          return;
        }
      } catch {
        // Not a direct barcode hit, fallback to quick search
      }

      const res = await api.get(`/products/search/quick?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.results || []);
      if (!res.data.results || res.data.results.length === 0) {
        setError(`No garment found matching "${q}". Please check barcode or name.`);
      }
    } catch (err: any) {
      setError('Failed to search garments. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectVariant = (item: any) => {
    setSelectedVariant(item);
    setCreditAmount(String(Number(item.sellingPrice || 0)));
    setSearchResults([]);
    setError(null);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) {
      setError('Please search and select the garment to exchange');
      return;
    }

    const val = parseFloat(creditAmount);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid exchange credit value (e.g. ₹699.00)');
      return;
    }

    const vId = selectedVariant.variantId || selectedVariant.id;
    if (!vId) {
      setError('Please select a valid garment variant.');
      return;
    }

    onApplyExchange({
      variantId: vId,
      productName: selectedVariant.productName || selectedVariant.name || 'Garment',
      size: selectedVariant.size,
      color: selectedVariant.color,
      barcode: selectedVariant.barcode || '',
      quantity: Math.max(1, quantity),
      creditAmount: val,
      reason: reason.trim() || 'Garment Exchange Deduction',
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/10 rounded-lg">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Exchange Garment / Deduct Old Bill</h3>
              <p className="text-[11px] text-amber-100">
                Restock old garment to inventory & subtract value from new bill
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Search Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Scan Barcode or Search Returned Garment
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Scan tag or type name / size (e.g. Oxford Shirt 38)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearching}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Search
              </button>
            </div>
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && !selectedVariant && (
            <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-sm">
              {searchResults.map((item) => (
                <button
                  key={item.variantId || item.id}
                  type="button"
                  onClick={() => handleSelectVariant(item)}
                  className="w-full px-3 py-2 text-left hover:bg-amber-50/70 flex items-center justify-between transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{item.productName || item.name}</p>
                    <p className="text-[10px] text-slate-500">
                      Size: {item.size} • Color: {item.color} • Barcode: {item.barcode}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-xs text-amber-700">₹{item.sellingPrice}</span>
                    <span className="block text-[9px] text-slate-400">Stock: {item.currentStock}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected Variant Display Card */}
          {selectedVariant && (
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md text-[10px] font-bold uppercase tracking-wide mb-1">
                    <CheckCircle2 className="w-3 h-3 text-amber-700" />
                    Garment Selected
                  </span>
                  <h4 className="font-bold text-sm text-slate-900">
                    {selectedVariant.productName || selectedVariant.name}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Size: <span className="font-bold text-slate-800">{selectedVariant.size}</span> • Color:{' '}
                    <span className="font-bold text-slate-800">{selectedVariant.color}</span>
                  </p>
                  <p className="text-[11px] font-mono text-slate-500">Barcode: {selectedVariant.barcode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVariant(null);
                    setCreditAmount('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold underline"
                >
                  Change
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-200/60">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Return Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center"
                  />
                  <p className="text-[9px] text-emerald-700 font-medium mt-0.5">
                    ✓ Stock will increment by +{quantity}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Exchange Credit Value (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-amber-900 text-right"
                  />
                  <p className="text-[9px] text-slate-500 mt-0.5">Amount to subtract from bill</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Exchange Reason / Notes</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Size exchange from 38 to 40"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!selectedVariant}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Apply Exchange Deduction (-₹{Number(creditAmount || 0).toFixed(2)})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
