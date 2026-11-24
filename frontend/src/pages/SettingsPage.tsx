import React, { useState, useEffect } from 'react';
import { Settings, Printer, Store, Tag, Save, CheckCircle2, ShieldAlert, Trash2, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { StoreSettings } from '../types';
import { ResetDatabaseModal } from '../components/common/ResetDatabaseModal';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetScopeToOpen, setResetScopeToOpen] = useState<'TRANSACTIONS_ONLY' | 'FULL_WIPE'>('TRANSACTIONS_ONLY');

  useEffect(() => {
    api.get('/settings').then((res) => {
      setSettings(res.data.settings);
    }).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setIsSaving(true);
      await api.put('/settings', settings);
      setSuccessNotice(true);
      setTimeout(() => setSuccessNotice(false), 3000);
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return <div className="p-8 text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="px-8 py-5 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Store & Hardware Printer Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure shop metadata, tax details, 58mm/80mm receipt templates, and barcode label dimensions
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {successNotice && (
        <div className="mx-8 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Store settings and printer configurations updated successfully!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <form onSubmit={handleSave} className="max-w-4xl space-y-6">
          {/* Section 1: Shop Information */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Store className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Shop Information & Invoice Header
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Store / Shop Name *</label>
                <input
                  type="text"
                  required
                  value={settings.storeName}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Phone *</label>
                <input
                  type="text"
                  required
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Street Address Line 1 *</label>
                <input
                  type="text"
                  required
                  value={settings.addressLine1}
                  onChange={(e) => setSettings({ ...settings, addressLine1: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  value={settings.addressLine2 || ''}
                  onChange={(e) => setSettings({ ...settings, addressLine2: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={settings.city}
                    onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={settings.state}
                    onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={settings.pincode}
                    onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Store Email</label>
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Taxation & Numbering */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              GST Taxation & Invoice Numbering
            </h3>

            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">GSTIN (15 Digits)</label>
                <input
                  type="text"
                  value={settings.gstin || ''}
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={settings.invoicePrefix}
                  onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Currency Code</label>
                <input
                  type="text"
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="gstEnabled"
                checked={settings.gstEnabled}
                onChange={(e) => setSettings({ ...settings, gstEnabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <label htmlFor="gstEnabled" className="text-xs font-bold text-slate-800">
                Enable GST Tax calculation and printing on receipts
              </label>
            </div>
          </div>

          {/* Section 3: Dual Printer Configurations */}
          <div className="grid grid-cols-2 gap-6">
            {/* 1. Thermal Billing Receipt Printer */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Printer className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Billing Receipt Printer (Thermal)
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Paper Roll Width</label>
                  <select
                    value={settings.receiptPaperSize}
                    onChange={(e) => setSettings({ ...settings, receiptPaperSize: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="80mm">80mm (Standard Wide Roll - 3 inch)</option>
                    <option value="58mm">58mm (Compact Roll - 2 inch)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Receipt Footer Note</label>
                  <textarea
                    rows={3}
                    value={settings.receiptFooter}
                    onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="printGstDetails"
                    checked={settings.printGstDetails}
                    onChange={(e) => setSettings({ ...settings, printGstDetails: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="printGstDetails" className="text-xs text-slate-700">
                    Print GSTIN number on receipts
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showMrpOnReceipt"
                    checked={settings.showMrpOnReceipt !== false}
                    onChange={(e) => setSettings({ ...settings, showMrpOnReceipt: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="showMrpOnReceipt" className="text-xs text-slate-700">
                    Show Total MRP & Customer Savings Banner on receipts
                  </label>
                </div>
              </div>
            </div>

            {/* 2. Barcode Label Printer */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Tag className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Barcode Label Printer (Stickers)
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Label Width (mm)</label>
                    <input
                      type="number"
                      value={settings.barcodeLabelWidth}
                      onChange={(e) => setSettings({ ...settings, barcodeLabelWidth: parseInt(e.target.value, 10) || 50 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Label Height (mm)</label>
                    <input
                      type="number"
                      value={settings.barcodeLabelHeight}
                      onChange={(e) => setSettings({ ...settings, barcodeLabelHeight: parseInt(e.target.value, 10) || 25 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-center"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed pt-2">
                  Supported formats: Standard 50mm × 25mm garment price tags, 38mm × 25mm jewelry/apparel tags, and thermal continuous roll paper.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Danger Zone - Store Go-Live & Data Reset */}
          <div className="bg-white border-2 border-rose-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-rose-100 pb-3">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Danger Zone: Store Go-Live & Data Reset
                </h3>
                <p className="text-xs text-slate-500">
                  Transition from testing to live production. Permanently clear test transactions, orders, or test products.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-1">
              {/* Option A: Reset Orders Only */}
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs text-amber-900 uppercase tracking-wide">
                    Option A: Wipe Test Sales & Orders Only
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Clears all test sales bills, customer order logs, and payment records. Resets the invoice number back to <strong>1001</strong>. <strong>Preserves your created garment masters, variants, and categories.</strong>
                  </p>
                </div>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setResetScopeToOpen('TRANSACTIONS_ONLY');
                      setIsResetModalOpen(true);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 inline-flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset Orders & Sales Only
                  </button>
                </div>
              </div>

              {/* Option B: Full Factory Reset */}
              <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs text-rose-900 uppercase tracking-wide">
                    Option B: Full Factory Reset (Complete Clean Slate)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Wipes all test products, variants, brands, categories, purchases, and orders. Starts 100% fresh for your real product CSV import. <strong>Admin user and printer configs are safely preserved.</strong>
                  </p>
                </div>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setResetScopeToOpen('FULL_WIPE');
                      setIsResetModalOpen(true);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 inline-flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Factory Reset Everything
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Reset Database Modal */}
      <ResetDatabaseModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        initialScope={resetScopeToOpen}
      />
    </div>
  );
};
