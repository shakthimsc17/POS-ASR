import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Percent,
  Layers,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import api from '../services/api';
import { CartItem, Order, StoreSettings } from '../types';
import { useAuth } from '../context/AuthContext';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { ReceiptPrintModal } from '../components/common/ReceiptPrintModal';
import { ExchangeGarmentModal, ExchangedGarment } from '../components/common/ExchangeGarmentModal';

export const POSBillingPage: React.FC = () => {
  const { user, isAdmin } = useAuth();

  // Search & Scanner Inputs
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [billDiscount, setBillDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'SPLIT'>('CASH');
  const [cashPaid, setCashPaid] = useState<string>('');
  const [digitalPaid, setDigitalPaid] = useState<string>('');
  const [cashTendered, setCashTendered] = useState<string>('');

  // Exchange State
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [exchangeItems, setExchangeItems] = useState<ExchangedGarment[]>([]);

  // Customer State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Feedback & Receipt Modal
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const isScanningRef = useRef<boolean>(false);

  // Load Settings
  useEffect(() => {
    api.get('/settings').then((res) => {
      setStoreSettings(res.data.settings);
    }).catch(console.error);
  }, []);

  // Keyboard shortcut listener (F1, F2, F4, F8, F9)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        setPaymentMethod((prev) => {
          if (prev === 'CASH') return 'UPI';
          if (prev === 'UPI') return 'CARD';
          if (prev === 'CARD') return 'SPLIT';
          return 'CASH';
        });
      } else if (e.key === 'F9' && cart.length > 0 && !isSubmitting) {
        e.preventDefault();
        handleCheckout();
      } else if (e.altKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        setIsExchangeModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [cart, exchangeItems, isSubmitting]);

  // Hook for zero-click USB Barcode Scanner Wedge
  useBarcodeScanner({
    onScan: (scannedCode) => {
      handleLookupBarcode(scannedCode);
    },
  });

  // Handle Barcode Lookup with Deduplication Guard
  const handleLookupBarcode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    // Prevent double-scan within 600ms or concurrent execution (e.g. input onKeyDown + global scanner hook)
    const now = Date.now();
    if (
      isScanningRef.current ||
      (lastScanRef.current.code === trimmed && now - lastScanRef.current.time < 600)
    ) {
      setBarcodeInput('');
      return;
    }

    lastScanRef.current = { code: trimmed, time: now };
    isScanningRef.current = true;
    setBarcodeInput('');

    try {
      setErrorNotice(null);
      const res = await api.get(`/products/variant/barcode/${encodeURIComponent(trimmed)}`);
      const data = res.data;
      const v = data.variant;

      // Add directly to cart with initial quantity 1
      addToCart({
        variantId: v.id,
        productId: v.productId,
        productName: data.productName,
        itemCode: data.itemCode,
        size: v.size,
        color: v.color,
        barcode: v.barcode,
        unitPrice: Number(v.sellingPrice),
        mrp: Number(v.mrp),
        quantity: 1,
        discountAmount: (Number(v.sellingPrice) * Number(v.defaultDiscount || 0)) / 100,
        taxAmount: (Number(v.sellingPrice) * data.gstRate) / 100,
        gstRate: data.gstRate,
        availableStock: v.currentStock,
      });
    } catch (err: any) {
      setErrorNotice(err.response?.data?.error || `Barcode "${trimmed}" not recognized in inventory`);
    } finally {
      setTimeout(() => {
        isScanningRef.current = false;
      }, 300);
    }
  };

  // Quick Search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.get(`/products/search/quick?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Add Item to Cart
  const addToCart = (newItem: CartItem) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.variantId === newItem.variantId);
      if (existingIndex > -1) {
        const item = prev[existingIndex];
        if (item.quantity + 1 > item.availableStock) {
          setErrorNotice(`Only ${item.availableStock} in stock for ${item.productName} (${item.size}/${item.color})`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...item,
          quantity: item.quantity + 1,
        };
        return updated;
      } else {
        if (newItem.availableStock < 1) {
          setErrorNotice(`Item is out of stock (${newItem.productName})`);
          return prev;
        }
        return [...prev, newItem];
      }
    });
  };

  // Update Cart Quantity
  const updateQuantity = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variantId === variantId) {
            const nextQty = item.quantity + delta;
            if (nextQty > item.availableStock) {
              setErrorNotice(`Cannot exceed available stock of ${item.availableStock}`);
              return item;
            }
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove Item from Cart
  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  // Update Line Item Discount
  const updateItemDiscount = (variantId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.variantId === variantId ? { ...item, discountAmount: Math.max(0, discount) } : item
      )
    );
  };

  // Financial Calculations
  const totalMrp = cart.reduce((sum, item) => sum + (item.mrp || item.unitPrice) * item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalItemDiscounts = cart.reduce((sum, item) => sum + item.discountAmount * item.quantity, 0);
  const totalGst = storeSettings?.gstEnabled
    ? cart.reduce((sum, item) => sum + ((item.unitPrice * item.gstRate) / 100) * item.quantity, 0)
    : 0;
  const totalExchangeCredit = exchangeItems.reduce((sum, item) => sum + item.creditAmount, 0);
  const netPayable = Math.max(0, subtotal - totalItemDiscounts - billDiscount + totalGst - totalExchangeCredit);
  
  // Real customer savings from genuine MRP difference and explicit discounts (ignoring exchange credit tender)
  const genuineDiscounts = (totalMrp - subtotal) + totalItemDiscounts + billDiscount;
  const totalSavings = Math.max(0, genuineDiscounts);

  // Change calculation when cash tendered is entered
  const numTendered = parseFloat(cashTendered);
  const changeAmount = !isNaN(numTendered) ? numTendered - netPayable : 0;

  // Complete Checkout Sale
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorNotice('Cart is empty. Please scan or select garments.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorNotice(null);

      const payload = {
        customerPhone: customerPhone.trim() || undefined,
        customerName: customerName.trim() || undefined,
        items: cart.map((item) => ({
          productVariantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount * item.quantity,
          taxAmount: storeSettings?.gstEnabled ? ((item.unitPrice * item.gstRate) / 100) * item.quantity : 0,
        })),
        billDiscount,
        paymentMethod,
        cashPaid:
          paymentMethod === 'SPLIT'
            ? Number(cashPaid) || 0
            : paymentMethod === 'CASH' && cashTendered && !isNaN(numTendered)
            ? numTendered
            : undefined,
        digitalPaid: paymentMethod === 'SPLIT' ? Number(digitalPaid) || 0 : undefined,
        exchangeItems: exchangeItems.map((ex) => ({
          productVariantId: ex.variantId,
          quantity: ex.quantity,
          creditAmount: ex.creditAmount,
          reason: ex.reason,
        })),
      };

      const res = await api.post('/sales/checkout', payload);
      const createdOrder = res.data.order;

      setSuccessOrder(createdOrder);
      setIsPrintModalOpen(true);

      // Reset cart and fields
      setCart([]);
      setExchangeItems([]);
      setBillDiscount(0);
      setCustomerPhone('');
      setCustomerName('');
      setCashPaid('');
      setDigitalPaid('');
      setCashTendered('');
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      setErrorNotice(err.response?.data?.error || 'Failed to complete sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-slate-100">
      {/* LEFT SECTION: Search, Barcode & Fast Catalog (55% width) */}
      <div className="w-7/12 border-r border-slate-200 flex flex-col h-full bg-slate-50">
        {/* Top Scan & Search Bar */}
        <div className="p-4 bg-white border-b border-slate-200 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Barcode Fast Scan Input */}
            <div className="flex-1 relative">
              <Barcode className="w-5 h-5 text-emerald-600 absolute left-3.5 top-3" />
              <input
                ref={barcodeInputRef}
                type="text"
                autoFocus
                placeholder="Scan Barcode or Type & Enter [F1]"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLookupBarcode(barcodeInput);
                  }
                }}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Product Name/Code Search */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search Item Name, Style Code [F2]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <div className="flex items-center gap-3">
              <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">F1</kbd> Barcode</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">F2</kbd> Search</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">F8</kbd> Payment</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">F9</kbd> Checkout</span>
            </div>
            <span className="text-emerald-700 font-medium">⚡ Zero-latency scanner active</span>
          </div>
        </div>

        {/* Error Alert Notice */}
        {errorNotice && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorNotice}</span>
            </div>
            <button onClick={() => setErrorNotice(null)} className="font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Search Results / Garment Variant Picker Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {searchResults.map((item) => (
                <div
                  key={item.variantId}
                  onClick={() => {
                    addToCart({
                      variantId: item.variantId,
                      productId: item.productId,
                      productName: item.productName,
                      itemCode: item.itemCode,
                      size: item.size,
                      color: item.color,
                      barcode: item.barcode,
                      unitPrice: item.sellingPrice,
                      mrp: item.mrp,
                      quantity: 1,
                      discountAmount: (item.sellingPrice * (item.defaultDiscount || 0)) / 100,
                      taxAmount: ((item.sellingPrice * item.gstRate) / 100),
                      gstRate: item.gstRate,
                      availableStock: item.currentStock,
                    });
                  }}
                  className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {item.itemCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.currentStock > 5
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.currentStock > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        Stock: {item.currentStock}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mt-1 group-hover:text-emerald-700 line-clamp-1">
                      {item.productName}
                    </h4>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold text-slate-700">
                        Size: {item.size}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold text-slate-700">
                        Color: {item.color}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-400 line-through">₹{item.mrp}</span>
                    <span className="font-extrabold text-base text-slate-900 group-hover:text-emerald-600">
                      ₹{item.sellingPrice}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Barcode className="w-12 h-12 opacity-30 text-emerald-500" />
              <p className="text-sm font-medium">Ready for Barcode Scanning or Search</p>
              <p className="text-xs text-slate-400">Scan dress barcode tag to automatically enter cart</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SECTION: Cart, Billing Summary & Checkout (45% width) */}
      <div className="w-5/12 flex flex-col h-full bg-white shadow-xl z-10">
        {/* Customer Phone Bar & Exchange Shortcut */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="tel"
              placeholder="Customer Phone (e.g. 9876543210)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="text"
              placeholder="Customer Name (Optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500">
              Active Cart ({cart.reduce((s, i) => s + i.quantity, 0)} pcs)
            </span>
            <button
              type="button"
              onClick={() => setIsExchangeModalOpen(true)}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all"
              title="Shortcut: Alt+E"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>Exchange Garment (Deduct Old Bill)</span>
            </button>
          </div>
        </div>

        {/* Cart Item Table Header */}
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 grid grid-cols-12 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
          <span className="col-span-5">Garment Item</span>
          <span className="col-span-3 text-center">Qty</span>
          <span className="col-span-2 text-right">Price</span>
          <span className="col-span-2 text-right">Action</span>
        </div>

        {/* Scrollable Cart Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-16">
              <ShoppingCart className="w-10 h-10 opacity-30" />
              <p className="text-sm font-semibold">Your Cart is Empty</p>
              <p className="text-xs">Scan or pick items from the catalog</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.variantId} className="py-3 grid grid-cols-12 items-center text-xs">
                {/* Product Name & Attributes */}
                <div className="col-span-5 pr-2">
                  <p className="font-bold text-slate-900 truncate">{item.productName}</p>
                  <p className="text-[10px] text-slate-500">
                    {item.size} • {item.color} • <span className="font-mono text-slate-400">{item.barcode}</span>
                  </p>
                  {item.discountAmount > 0 && (
                    <span className="inline-block mt-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Save ₹{(item.discountAmount * item.quantity).toFixed(0)} ({((item.discountAmount / item.unitPrice) * 100).toFixed(0)}% Off)
                    </span>
                  )}
                </div>

                {/* Qty Adjustment */}
                <div className="col-span-3 flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.variantId, -1)}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-sm text-slate-900">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.variantId, 1)}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Net Price */}
                <div className="col-span-2 text-right">
                  {item.discountAmount > 0 && (
                    <span className="block text-[10px] text-slate-400 line-through">
                      ₹{(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  )}
                  <span className="font-extrabold text-sm text-slate-900">
                    ₹{((item.unitPrice - item.discountAmount) * item.quantity).toFixed(2)}
                  </span>
                </div>

                {/* Remove Item */}
                <div className="col-span-2 flex justify-end">
                  <button
                    onClick={() => removeFromCart(item.variantId)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Exchanged Garments Deductions in Cart */}
          {exchangeItems.map((ex, idx) => (
            <div
              key={`ex-${idx}`}
              className="my-2 p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-200 text-amber-900 rounded-lg shrink-0">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-amber-200 text-amber-950 rounded text-[9px] font-black uppercase tracking-wider">
                      EXCHANGE CREDIT
                    </span>
                    <span className="font-bold text-slate-900">{ex.productName}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Size: {ex.size} • Color: {ex.color} • Return Qty: {ex.quantity} pc (+{ex.quantity} stock)
                  </p>
                  {ex.reason && <p className="text-[10px] text-amber-800 italic">{ex.reason}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-amber-900">-₹{ex.creditAmount.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => setExchangeItems((prev) => prev.filter((_, i) => i !== idx))}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Remove exchange item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* BOTTOM BILLING SUMMARY & CHECKOUT */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
          {/* Subtotal & Discounts */}
          <div className="space-y-1.5 text-xs">
            {totalMrp > subtotal && (
              <div className="flex justify-between text-slate-500">
                <span>Total MRP Value:</span>
                <span className="line-through">₹{totalMrp.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items):</span>
              <span className="font-semibold text-slate-900">₹{subtotal.toFixed(2)}</span>
            </div>

            {totalItemDiscounts > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Item Promotional Discounts:</span>
                <span>-₹{totalItemDiscounts.toFixed(2)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <Percent className="w-3 h-3 text-emerald-600" />
                Overall Bill Discount:
              </span>
              <div className="flex items-center gap-1">
                <span>₹</span>
                <input
                  type="number"
                  min="0"
                  value={billDiscount || ''}
                  onChange={(e) => setBillDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="w-20 px-2 py-0.5 text-right bg-white border border-slate-300 rounded text-xs font-semibold"
                />
              </div>
            </div>

            {storeSettings?.gstEnabled && totalGst > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>GST Tax:</span>
                <span className="font-semibold text-slate-900">+₹{totalGst.toFixed(2)}</span>
              </div>
            )}

            {totalExchangeCredit > 0 && (
              <div className="flex justify-between font-bold text-amber-800 pt-1 border-t border-amber-200">
                <span>Less Exchanged Garment Credit:</span>
                <span>-₹{totalExchangeCredit.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
              <span className="font-bold text-sm text-slate-800">NET PAYABLE:</span>
              <span className="font-black text-2xl text-emerald-700">₹{netPayable.toFixed(2)}</span>
            </div>

            {cart.length > 0 && subtotal < totalExchangeCredit && (
              <div className="p-2 bg-amber-100 border border-amber-300 rounded-xl text-amber-900 text-[11px] font-bold">
                ⚠️ Exchanged garment value (₹{totalExchangeCredit.toFixed(2)}) exceeds new items (₹{subtotal.toFixed(2)}). Per shop policy, please ensure customer purchases equal or higher value.
              </div>
            )}

            {totalSavings > 0 && (
              <div className="p-2 bg-emerald-100/70 border border-emerald-300 rounded-xl text-center text-xs font-bold text-emerald-900 mt-2">
                🎉 Total Customer Savings: ₹{totalSavings.toFixed(2)}!
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[
              { id: 'CASH', label: 'Cash', icon: Banknote },
              { id: 'UPI', label: 'UPI / GPay', icon: Smartphone },
              { id: 'CARD', label: 'Card', icon: CreditCard },
              { id: 'SPLIT', label: 'Split Pay', icon: Layers },
            ].map((pm) => {
              const Icon = pm.icon;
              const isSelected = paymentMethod === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id as any)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{pm.label}</span>
                </button>
              );
            })}
          </div>

          {/* Cash Tendered & Change Return Box */}
          {paymentMethod === 'CASH' && netPayable > 0 && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px]">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  Cash Received from Customer (Optional):
                </span>
                {cashTendered && (
                  <button
                    type="button"
                    onClick={() => setCashTendered('')}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={`e.g. ${netPayable.toFixed(0)} (or 500, 1000)`}
                    className="w-full pl-6 pr-3 py-1.5 bg-white border border-slate-300 focus:ring-2 focus:ring-emerald-500 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                {/* Quick Note Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCashTendered(String(netPayable))}
                    className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-bold transition-all shadow-xs"
                    title="Exact Net Amount"
                  >
                    Exact
                  </button>
                  {netPayable <= 500 && (
                    <button
                      type="button"
                      onClick={() => setCashTendered('500')}
                      className="px-2 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold transition-all shadow-xs"
                    >
                      ₹500
                    </button>
                  )}
                  {netPayable <= 1000 && (
                    <button
                      type="button"
                      onClick={() => setCashTendered('1000')}
                      className="px-2 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold transition-all shadow-xs"
                    >
                      ₹1000
                    </button>
                  )}
                  {netPayable <= 2000 && (
                    <button
                      type="button"
                      onClick={() => setCashTendered('2000')}
                      className="px-2 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold transition-all shadow-xs"
                    >
                      ₹2000
                    </button>
                  )}
                </div>
              </div>

              {/* Return Balance / Change Display */}
              {cashTendered && !isNaN(numTendered) && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  {changeAmount >= 0 ? (
                    <>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <span>Change to Return to Customer:</span>
                      </span>
                      <span className="font-black text-sm text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg border border-emerald-300 animate-in fade-in">
                        ₹{changeAmount.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-amber-800">
                        Shortage (Remaining to Collect):
                      </span>
                      <span className="font-black text-xs text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300">
                        ₹{Math.abs(changeAmount).toFixed(2)}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Split Pay Inputs */}
          {paymentMethod === 'SPLIT' && (
            <div className="grid grid-cols-2 gap-2 p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
              <div>
                <label className="text-[10px] font-bold text-emerald-800">Cash Portion (₹):</label>
                <input
                  type="number"
                  value={cashPaid}
                  onChange={(e) => setCashPaid(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full mt-0.5 px-2 py-1 bg-white border border-emerald-300 rounded text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-emerald-800">UPI/Card Portion (₹):</label>
                <input
                  type="number"
                  value={digitalPaid}
                  onChange={(e) => setDigitalPaid(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full mt-0.5 px-2 py-1 bg-white border border-emerald-300 rounded text-xs font-bold"
                />
              </div>
            </div>
          )}

          {/* Complete Sale & Print Bill Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isSubmitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Saving Order & Updating Stock...</span>
            ) : (
              <>
                <span>Complete Sale & Print Receipt [F9]</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Thermal Receipt Print Modal */}
      <ReceiptPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        order={successOrder}
        settings={storeSettings}
      />

      {/* Exchange Garment Modal */}
      <ExchangeGarmentModal
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        onApplyExchange={(newItem) => {
          setExchangeItems((prev) => [...prev, newItem]);
        }}
      />
    </div>
  );
};
