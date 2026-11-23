import React from 'react';
import { Printer, X, Check } from 'lucide-react';
import { Order, StoreSettings } from '../../types';

interface ReceiptPrintModalProps {
  order: Order | null;
  settings: StoreSettings | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  order,
  settings,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const is80mm = settings?.receiptPaperSize !== '58mm';
  const paperWidthClass = is80mm ? 'w-[80mm]' : 'w-[58mm]';

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      {/* Modal Dialog for On-Screen Review */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-base">Receipt Preview ({settings?.receiptPaperSize || '80mm'})</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200 flex justify-center">
          {/* Thermal Receipt Paper */}
          <div
            id="thermal-receipt"
            className={`printable-area bg-white text-black p-4 font-mono text-[11px] leading-tight shadow-lg border border-slate-300 ${paperWidthClass}`}
          >
            {/* Store Header */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h2 className="font-bold text-sm uppercase tracking-wider">{settings?.storeName || 'ASRTEX TEXTILE'}</h2>
              <p className="text-[10px]">{settings?.addressLine1}</p>
              {settings?.city && <p className="text-[10px]">{settings?.city}, {settings?.state} - {settings?.pincode}</p>}
              <p className="text-[10px]">Ph: {settings?.phone}</p>
              {settings?.printGstDetails && settings?.gstin && (
                <p className="text-[10px] font-semibold">GSTIN: {settings.gstin}</p>
              )}
              <p className="text-[9px] font-bold tracking-widest uppercase mt-0.5">
                {settings?.gstEnabled && settings?.gstin ? 'TAX INVOICE' : 'RETAIL CASH MEMO'}
              </p>
            </div>

            {/* Invoice Meta */}
            <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Invoice: <strong>{order.invoiceNumber}</strong></span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier: {order.user.employeeName}</span>
                <span>Mode: <strong>{order.paymentMethod}</strong></span>
              </div>
              {order.customer && (
                <div className="pt-0.5">
                  <span>Customer: {order.customer.name} ({order.customer.phone})</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="py-2 border-b border-dashed border-black">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-black">
                    <th className="pb-1 w-5/12">Item</th>
                    <th className="pb-1 text-center w-2/12">Qty</th>
                    <th className="pb-1 text-right w-2/12">Price</th>
                    <th className="pb-1 text-right w-3/12">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dotted divide-slate-300">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1">
                        <div className="font-semibold">{item.variant.product.name}</div>
                        <div className="text-[9px] text-slate-600">
                          {item.variant.size} / {item.variant.color}
                        </div>
                      </td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">₹{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="py-1 text-right font-medium">₹{Number(item.netAmount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Discounts */}
            <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{Number(order.subtotal).toFixed(2)}</span>
              </div>
              {(Number(order.itemDiscount) > 0 || Number(order.billDiscount) > 0) && (
                <div className="flex justify-between text-slate-800">
                  <span>Total Discount:</span>
                  <span>-₹{(Number(order.itemDiscount) + Number(order.billDiscount)).toFixed(2)}</span>
                </div>
              )}
              {Number(order.taxAmount) > 0 && (
                <div className="flex justify-between text-slate-800">
                  <span>GST / Tax:</span>
                  <span>+₹{Number(order.taxAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
                <span>NET PAYABLE:</span>
                <span>₹{Number(order.netAmount).toFixed(2)}</span>
              </div>

              {order.paymentMethod === 'SPLIT' && (
                <div className="pt-1 text-[9px] text-slate-700">
                  <div className="flex justify-between">
                    <span>Cash Paid:</span>
                    <span>₹{Number(order.cashPaid || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Digital Paid:</span>
                    <span>₹{Number(order.digitalPaid || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="pt-3 text-center text-[9px] leading-relaxed">
              {settings?.receiptFooter && (
                <p className="font-semibold">{settings.receiptFooter}</p>
              )}
              <p className="text-[8px] text-slate-500 pt-1">*** Software Powered by ASRTEX POS ***</p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium text-sm transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
