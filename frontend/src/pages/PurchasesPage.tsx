import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, Calendar, FileText, CheckCircle2, AlertCircle, X, Users, Phone, MapPin, Building2 } from 'lucide-react';
import api from '../services/api';
import { Purchase, Supplier, Product } from '../types';
import { QuickSupplierModal } from '../components/common/QuickSupplierModal';

export const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');

  // Supplier Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // New Purchase Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [purchaseInvoice, setPurchaseInvoice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Line Items in Purchase Entry
  const [items, setItems] = useState<Array<{
    productVariantId: string;
    productName: string;
    size: string;
    color: string;
    quantity: number;
    costPricePerUnit: number;
  }>>([]);

  // Selected item row to add
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [inputQty, setInputQty] = useState('10');
  const [inputCost, setInputCost] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [purRes, supRes, prodRes] = await Promise.all([
        api.get('/purchases'),
        api.get('/purchases/suppliers'),
        api.get('/products?limit=100'),
      ]);
      setPurchases(purRes.data.purchases || []);
      setSuppliers(supRes.data.suppliers || []);
      setProducts(prodRes.data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Collect all variants from products list for dropdown
  const allVariants = products.flatMap((p) =>
    p.variants.map((v) => ({
      variantId: v.id,
      label: `${p.itemCode} - ${p.name} (${v.size} / ${v.color})`,
      defaultCost: v.costPrice || 0,
      productName: p.name,
      size: v.size,
      color: v.color,
    }))
  );

  const handleAddLineItem = () => {
    if (!selectedVariantId) return;
    const found = allVariants.find((v) => v.variantId === selectedVariantId);
    if (!found) return;

    const qty = parseInt(inputQty, 10) || 1;
    const cost = parseFloat(inputCost) || found.defaultCost || 0;

    setItems((prev) => [
      ...prev,
      {
        productVariantId: found.variantId,
        productName: found.productName,
        size: found.size,
        color: found.color,
        quantity: qty,
        costPricePerUnit: cost,
      },
    ]);

    setSelectedVariantId('');
    setInputQty('10');
    setInputCost('');
  };

  const handleRemoveLineItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !purchaseInvoice || items.length === 0) {
      alert('Please fill supplier, invoice number, and add at least one line item');
      return;
    }

    try {
      await api.post('/purchases', {
        supplierId,
        purchaseInvoice,
        purchaseDate,
        notes,
        items,
      });

      setIsModalOpen(false);
      setItems([]);
      setPurchaseInvoice('');
      setNotes('');
      loadData();
      alert('Purchase successfully recorded. Stock levels have been incremented!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record purchase');
    }
  };

  const totalPurchaseCost = items.reduce((sum, item) => sum + item.quantity * item.costPricePerUnit, 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="px-8 py-5 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Purchase Inward & Suppliers</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record supplier bills, manage vendor accounts, and increment garment inventory
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'purchases'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Inward Invoices ({purchases.length})
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'suppliers'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Suppliers Directory ({suppliers.length})
            </button>
          </div>

          <button
            onClick={() => setIsSupplierModalOpen(true)}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            + Add Supplier
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Record New Purchase
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {activeTab === 'purchases' ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier Invoice #</th>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Received By</th>
                  <th className="py-3 px-4 text-center">Items Received</th>
                  <th className="py-3 px-4 text-right">Total Bill (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No purchase inward entries recorded yet. Click "Record New Purchase" to add your first bill.
                    </td>
                  </tr>
                ) : (
                  purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(p.purchaseDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.purchaseInvoice}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{p.supplier.name}</td>
                      <td className="py-3 px-4 text-slate-600">{p.receivedBy.employeeName}</td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-full text-[11px]">
                          {p.items.reduce((sum, item) => sum + item.quantity, 0)} units ({p.items.length} SKUs)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        ₹{Number(p.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Suppliers Directory View */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700 text-xs font-bold">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Registered Garment & Fabric Suppliers ({suppliers.length})</span>
              </div>
              <button
                onClick={() => setIsSupplierModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Supplier
              </button>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Supplier / Vendor Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4">Address / City</th>
                  <th className="py-3 px-4 text-center">Total Inward Bills</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No suppliers registered yet. Click "Add New Supplier" to create one.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3 px-4 text-slate-600">{s.contactPerson || '—'}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">{s.phone}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{s.gstin || '—'}</td>
                      <td className="py-3 px-4 text-slate-500">{s.address || '—'}</td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[11px]">
                          {s._count?.purchases || 0} bills
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Purchase Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">New Purchase Inward Entry</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Details */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Supplier *</label>
                    <button
                      type="button"
                      onClick={() => setIsSupplierModalOpen(true)}
                      className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Invoice Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CBM-2026-904"
                    value={purchaseInvoice}
                    onChange={(e) => setPurchaseInvoice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Add Variant Row */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Add Garment Variant to Inward
                </h4>
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Garment Variant</label>
                    <select
                      value={selectedVariantId}
                      onChange={(e) => {
                        const vId = e.target.value;
                        setSelectedVariantId(vId);
                        const found = allVariants.find((v) => v.variantId === vId);
                        if (found) setInputCost(String(found.defaultCost));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">Select Garment (Size & Color)</option>
                      {allVariants.map((v) => (
                        <option key={v.variantId} value={v.variantId}>{v.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Qty Received</label>
                    <input
                      type="number"
                      min="1"
                      value={inputQty}
                      onChange={(e) => setInputQty(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cost Price (₹)</label>
                    <input
                      type="number"
                      value={inputCost}
                      onChange={(e) => setInputCost(e.target.value)}
                      placeholder="e.g. 420"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>

                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">
                  Items Inward List ({items.length} items)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] font-bold text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3">Garment Item</th>
                        <th className="py-2.5 px-3">Size / Color</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Cost Price</th>
                        <th className="py-2.5 px-3 text-right">Line Total</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            No items added yet. Please select garments above.
                          </td>
                        </tr>
                      ) : (
                        items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-bold text-slate-900">{it.productName}</td>
                            <td className="py-2 px-3 text-slate-600">{it.size} / {it.color}</td>
                            <td className="py-2 px-3 text-center font-bold">{it.quantity}</td>
                            <td className="py-2 px-3 text-right">₹{it.costPricePerUnit.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              ₹{(it.quantity * it.costPricePerUnit).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(idx)}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total & Action */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Total Purchase Amount:</span>
                  <span className="ml-2 font-black text-xl text-slate-900">₹{totalPurchaseCost.toFixed(2)}</span>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                  >
                    Commit Inward & Increase Stock
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quick Supplier Modal */}
      <QuickSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSupplierCreated={(newSup) => {
          setSuppliers((prev) => {
            const exists = prev.some((s) => s.id === newSup.id);
            return exists ? prev : [...prev, newSup];
          });
          setSupplierId(newSup.id);
        }}
      />
    </div>
  );
};
