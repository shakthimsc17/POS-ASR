import React, { useState } from 'react';
import { Printer, X, ZoomIn } from 'lucide-react';
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

  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>('80mm');
  const [printScale, setPrintScale] = useState<number>(100); // 100%, 120%, 135%

  const is80mm = paperSize === '80mm';

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

  const totalMrpValue = order.items.reduce(
    (sum, item) => sum + (Number(item.mrpSnapshot) || Number(item.unitPrice)) * item.quantity,
    0
  );
  const totalCustomerSavings = Math.max(0, totalMrpValue - Number(order.netAmount));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      {/* ATPOS AT-402 True 3-Inch Full Width Thermal Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 0mm !important;
          }
          body, html {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          .printable-area, .printable-area * {
            visibility: visible !important;
          }
          .printable-area {
            position: absolute !important;
            left: 0 !important;
            right: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #thermal-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            margin: 0 !important;
            padding: 1.5mm 2.5mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            ${
              printScale !== 100
                ? `zoom: ${printScale / 100}; -moz-transform: scale(${printScale / 100}); -moz-transform-origin: top left;`
                : ''
            }
          }
          .autocutter-feed-buffer {
            display: block !important;
            height: 24mm !important; /* Invisible blank paper feed so ATPOS auto-cutter cuts below footer */
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: avoid !important;
          }
        }
      `}</style>

      {/* Modal Dialog for On-Screen Review */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base leading-none">ATPOS AT-402 Receipt Print</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Full 3-Inch (80mm) Wide Thermal Cash Memo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Controls Bar */}
        <div className="px-6 py-3 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700 text-xs">
          {/* Roll Width Selection */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Roll Width:</span>
            <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setPaperSize('80mm')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  is80mm ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                3-Inch (80mm ATPOS)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('58mm')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  !is80mm ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                2-Inch (58mm)
              </button>
            </div>
          </div>

          {/* Width / Scale Adjustment (ensures full 3-inch coverage) */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
              Width Fill:
            </span>
            <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700 font-bold">
              <button
                type="button"
                onClick={() => setPrintScale(100)}
                className={`px-2 py-1 rounded-md ${
                  printScale === 100 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setPrintScale(120)}
                className={`px-2 py-1 rounded-md ${
                  printScale === 120 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                120% Wide
              </button>
              <button
                type="button"
                onClick={() => setPrintScale(135)}
                className={`px-2 py-1 rounded-md ${
                  printScale === 135 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                135% Max
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200 flex justify-center">
          {/* On-screen visual container */}
          <div className="w-full max-w-[420px]">
            {/* Thermal Receipt Paper */}
            <div
              id="thermal-receipt"
              className="printable-area bg-white text-black px-4 py-5 font-sans leading-tight shadow-2xl border border-slate-300 w-full box-border"
            >
              {/* Store Header */}
              <div className="text-center pb-2 border-b-2 border-dashed border-black w-full">
                <h2 className="font-black text-2xl uppercase tracking-wider text-black leading-tight">
                  {settings?.storeName || 'ASRTEX TEXTILE & READYMADES'}
                </h2>
                {settings?.addressLine1 && (
                  <p className="text-xs font-bold text-black mt-1">{settings.addressLine1}</p>
                )}
                {settings?.city && (
                  <p className="text-xs font-bold text-black">
                    {settings.city}, {settings.state} - {settings.pincode}
                  </p>
                )}
                {settings?.phone && (
                  <p className="text-xs font-black text-black mt-0.5">Ph: {settings.phone}</p>
                )}
                {settings?.printGstDetails && settings?.gstin && (
                  <p className="text-xs font-black text-black mt-0.5">GSTIN: {settings.gstin}</p>
                )}
                <div className="mt-2 pt-1.5 border-t-2 border-black">
                  <p className="text-sm font-black tracking-widest uppercase">
                    {settings?.gstEnabled && settings?.gstin ? 'TAX INVOICE' : 'RETAIL CASH MEMO'}
                  </p>
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="py-2 border-b-2 border-dashed border-black space-y-1.5 text-xs w-full">
                <div className="flex justify-between items-center text-sm font-bold text-black">
                  <span>Invoice: <strong className="font-black text-base">{order.invoiceNumber}</strong></span>
                  <span className="font-bold text-sm text-black">{formattedDate}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-xs text-black">
                  <span>Cashier: <span className="font-extrabold">{order.user.employeeName}</span></span>
                  <span>Mode: <strong className="font-black uppercase">{order.paymentMethod}</strong></span>
                </div>
                {order.customer && (
                  <div className="pt-1 text-xs font-bold border-t border-dotted border-black">
                    <span>Customer: {order.customer.name} ({order.customer.phone})</span>
                  </div>
                )}
              </div>

              {/* Line Items Table - Exact 3-Inch Width Distribution */}
              <div className="py-2.5 border-b-2 border-dashed border-black w-full">
                <table className="w-full text-left table-fixed border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black text-xs font-black uppercase">
                      <th className="pb-1.5 w-[46%] text-left">ITEM</th>
                      <th className="pb-1.5 w-[14%] text-center">QTY</th>
                      <th className="pb-1.5 w-[18%] text-right">PRICE</th>
                      <th className="pb-1.5 w-[22%] text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dotted divide-black">
                    {order.items.map((item, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="py-2 pr-1 break-words">
                          <div className="font-black text-sm text-black leading-snug">
                            {item.variant.product.name}
                          </div>
                          <div className="text-xs font-bold text-black mt-0.5">
                            {item.variant.size} / {item.variant.color}
                            {settings?.showMrpOnReceipt !== false && Number(item.mrpSnapshot) > 0 && (
                              <span className="ml-1 font-semibold text-[11px]">
                                (MRP: ₹{Number(item.mrpSnapshot).toFixed(0)})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 text-center font-black text-sm text-black">{item.quantity}</td>
                        <td className="py-2 text-right font-bold text-xs text-black">
                          ₹{Number(item.unitPrice).toFixed(2)}
                        </td>
                        <td className="py-2 text-right font-black text-sm text-black">
                          ₹{Number(item.netAmount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Discounts - Spans Full 3-Inch Width */}
              <div className="py-2 border-b-2 border-dashed border-black space-y-1.5 w-full">
                {settings?.showMrpOnReceipt !== false && totalMrpValue > Number(order.subtotal) && (
                  <div className="flex justify-between font-bold text-base text-black">
                    <span>Total MRP Value:</span>
                    <span className="line-through font-black text-base">₹{totalMrpValue.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-black">
                  <span>Subtotal:</span>
                  <span className="font-black text-base">₹{Number(order.subtotal).toFixed(2)}</span>
                </div>
                {(Number(order.itemDiscount) > 0 || Number(order.billDiscount) > 0) && (
                  <div className="flex justify-between font-black text-sm text-black">
                    <span>Total Discount:</span>
                    <span>-₹{(Number(order.itemDiscount) + Number(order.billDiscount)).toFixed(2)}</span>
                  </div>
                )}
                {Number(order.taxAmount) > 0 && (
                  <div className="flex justify-between font-bold text-sm text-black">
                    <span>GST / Tax:</span>
                    <span>+₹{Number(order.taxAmount).toFixed(2)}</span>
                  </div>
                )}

                {/* Exchanged Garment Returns Deduction */}
                {order.returns && order.returns.length > 0 && (
                  <div className="py-1 border-t border-dotted border-black space-y-1">
                    {order.returns.map((ret: any, rIdx: number) => (
                      <div key={rIdx} className="flex justify-between font-black text-sm text-black">
                        <span className="truncate pr-2">Less Exchange ({ret.reason || 'Garment Return'}):</span>
                        <span>-₹{Number(ret.refundAmount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Net Payable - Prominent & Full Width */}
                <div className="flex justify-between items-center py-2.5 border-y-2 border-black my-1.5 text-black w-full">
                  <span className="text-base font-black tracking-tight uppercase">NET PAYABLE:</span>
                  <span className="text-2xl font-black tracking-tight">₹{Number(order.netAmount).toFixed(2)}</span>
                </div>

                {/* Savings Announcement Banner */}
                {settings?.showMrpOnReceipt !== false && totalCustomerSavings > 0 && (
                  <div className="my-2 py-2 px-2 border-2 border-dashed border-black text-center text-black w-full box-border">
                    <p className="text-xs font-black uppercase tracking-wider">
                      🎉 YOU SAVED A TOTAL OF ₹{totalCustomerSavings.toFixed(2)}! 🎉
                    </p>
                  </div>
                )}

                {order.paymentMethod === 'SPLIT' && (
                  <div className="pt-1 text-xs font-bold text-black space-y-0.5 border-t border-dotted border-black w-full">
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

              {/* Clean Footer Notice */}
              <div className="pt-4 text-center space-y-1 w-full">
                {settings?.receiptFooter && (
                  <p className="text-xs font-black text-black uppercase leading-normal">
                    {settings.receiptFooter}
                  </p>
                )}
                <p className="text-[10px] font-bold text-black pt-1">
                  *** Software Powered by ASRTEX POS ***
                </p>
              </div>

              {/* Pure Blank Feed Buffer for Auto-Cutter (Feeds blank paper so blade cuts cleanly below footer without printing any static words) */}
              <div className="autocutter-feed-buffer h-16 w-full" aria-hidden="true"></div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Format: <strong className="text-slate-800">ATPOS AT-402 (3" Full Width at {printScale}%)</strong>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
