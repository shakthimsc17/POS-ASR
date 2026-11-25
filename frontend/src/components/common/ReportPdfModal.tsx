import React from 'react';
import { X, Printer, Download, FileText, CheckCircle2 } from 'lucide-react';
import { StoreSettings } from '../../types';

export interface ReportPdfColumn {
  header: string;
  accessor: string | ((row: any, index: number) => React.ReactNode);
  align?: 'left' | 'center' | 'right';
  width?: string;
  bold?: boolean;
}

export interface ReportPdfSummaryItem {
  label: string;
  value: string | number;
  color?: string;
}

interface ReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  settings?: StoreSettings | null;
  generatedBy?: string;
  summaryCards?: ReportPdfSummaryItem[];
  columns: ReportPdfColumn[];
  data: any[];
  totalsRow?: { [key: string]: string | number };
  orientation?: 'portrait' | 'landscape';
}

export const ReportPdfModal: React.FC<ReportPdfModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  settings,
  generatedBy = 'Administrator',
  summaryCards = [],
  columns,
  data,
  totalsRow,
  orientation = 'portrait',
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      {/* Print Specific CSS Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation};
            margin: 12mm 10mm 15mm 10mm;
          }
          body * {
            visibility: hidden;
          }
          #report-pdf-sheet, #report-pdf-sheet * {
            visibility: visible;
          }
          #report-pdf-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Modal Dialog Container */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header Toolbar (Hidden in Print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-snug">{title}</h3>
              <p className="text-xs text-slate-400">{subtitle || 'Official Store PDF & Print Preview'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 shadow-lg transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Preview Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
          <div
            id="report-pdf-sheet"
            className={`bg-white text-slate-900 p-8 shadow-xl border border-slate-300 w-full ${
              orientation === 'landscape' ? 'max-w-5xl' : 'max-w-4xl'
            }`}
          >
            {/* Store Letterhead */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                  {settings?.storeName || 'ASRTEX TEXTILE & READYMADES'}
                </h1>
                {settings?.addressLine1 && (
                  <p className="text-xs text-slate-600 font-medium mt-0.5">{settings.addressLine1}</p>
                )}
                <p className="text-xs text-slate-600 font-medium">
                  {[settings?.city, settings?.state, settings?.pincode].filter(Boolean).join(', ')}
                </p>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                  {settings?.phone && <span>Ph: <strong>{settings.phone}</strong></span>}
                  {settings?.gstin && <span>GSTIN: <strong>{settings.gstin}</strong></span>}
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 text-slate-800 font-black text-xs uppercase tracking-wider rounded-md">
                  {title}
                </span>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Generated: <strong className="text-slate-800">{currentDate}</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  By: <strong className="text-slate-800">{generatedBy}</strong>
                </p>
              </div>
            </div>

            {/* Subtitle / Period Banner */}
            {subtitle && (
              <div className="mb-4 py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex justify-between">
                <span>Report Scope / Period: {subtitle}</span>
                <span>Records Count: {data.length}</span>
              </div>
            )}

            {/* Top Summary Cards (if any) */}
            {summaryCards.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {summaryCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5"
                  >
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {card.label}
                    </span>
                    <p className={`text-base font-black ${card.color || 'text-slate-900'}`}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Main Report Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-800 font-black text-[10px] uppercase">
                    {columns.map((col, cIdx) => (
                      <th
                        key={cIdx}
                        style={{ width: col.width }}
                        className={`py-2 px-2.5 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="py-8 text-center text-slate-400">
                        No transactions or records found for this period.
                      </td>
                    </tr>
                  ) : (
                    data.map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        {columns.map((col, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-1.5 px-2.5 ${
                              col.align === 'right'
                                ? 'text-right'
                                : col.align === 'center'
                                ? 'text-center'
                                : 'text-left'
                            } ${col.bold ? 'font-bold' : ''}`}
                          >
                            {typeof col.accessor === 'function'
                              ? col.accessor(row, rIdx)
                              : row[col.accessor]}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Optional Totals Row */}
                {totalsRow && (
                  <tfoot>
                    <tr className="border-t-2 border-b-2 border-slate-900 bg-slate-100 text-slate-900 font-black">
                      {columns.map((col, cIdx) => {
                        const val = totalsRow[col.accessor as string] ?? (cIdx === 0 ? 'TOTAL' : '');
                        return (
                          <td
                            key={cIdx}
                            className={`py-2 px-2.5 ${
                              col.align === 'right'
                                ? 'text-right'
                                : col.align === 'center'
                                ? 'text-center'
                                : 'text-left'
                            }`}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Document Footer & Signatures */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
              <div>
                <p className="font-semibold text-slate-700">ASRTEX POS Smart Retail Accounting</p>
                <p className="text-[10px]">This is a computer-generated audit report. Verified & validated.</p>
              </div>
              <div className="text-right">
                <div className="w-40 border-b border-slate-400 pb-1 mb-1"></div>
                <p className="font-bold text-slate-800 text-[11px]">Authorized Store Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
