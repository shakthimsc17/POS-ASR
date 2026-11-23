import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  Boxes,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';

interface ParsedRow {
  item_code: string;
  product_name: string;
  category: string;
  subcategory?: string;
  brand?: string;
  size: string;
  color: string;
  cost_price: number;
  mrp: number;
  selling_price: number;
  default_discount_pct: number;
  stock_quantity: number;
  barcode?: string;
  isValid: boolean;
  errorReason?: string;
}

export const ImportProductsPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Helper to parse CSV string into structured objects
  const parseCSVText = (text: string): ParsedRow[] => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Split by comma ignoring commas inside quotes
      const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) =>
        v.trim().replace(/^"|"$/g, '')
      );

      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });

      const item_code = (rowObj.item_code || rowObj.itemcode || '').toUpperCase();
      const product_name = rowObj.product_name || rowObj.productname || '';
      const category = rowObj.category || '';
      const subcategory = rowObj.subcategory || undefined;
      const brand = rowObj.brand || undefined;
      const size = rowObj.size || 'Free Size';
      const color = rowObj.color || 'Standard';
      const cost_price = parseFloat(rowObj.cost_price || rowObj.costprice) || 0;
      const mrp = parseFloat(rowObj.mrp) || 0;
      const selling_price = parseFloat(rowObj.selling_price || rowObj.sellingprice) || mrp || 0;
      const default_discount_pct = parseFloat(rowObj.default_discount_pct || rowObj.defaultdiscount) || 0;
      const stock_quantity = parseInt(rowObj.stock_quantity || rowObj.stockquantity, 10) || 0;
      const barcode = rowObj.barcode || undefined;

      let isValid = true;
      let errorReason = '';

      if (!item_code) {
        isValid = false;
        errorReason = 'Missing item_code';
      } else if (!product_name) {
        isValid = false;
        errorReason = 'Missing product_name';
      } else if (!category) {
        isValid = false;
        errorReason = 'Missing category';
      }

      rows.push({
        item_code,
        product_name,
        category,
        subcategory,
        brand,
        size,
        color,
        cost_price,
        mrp,
        selling_price,
        default_discount_pct,
        stock_quantity,
        barcode,
        isValid,
        errorReason,
      });
    }

    return rows;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setErrorNotice(null);
    setImportResult(null);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSVText(text);
        if (rows.length === 0) {
          setErrorNotice('Uploaded CSV file appears to be empty or has an invalid header row.');
        }
        setParsedRows(rows);
      } catch (err: any) {
        setErrorNotice('Failed to parse CSV file: ' + err.message);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(uploadedFile);
  };

  const handleDownloadSample = async () => {
    try {
      const response = await api.get('/products/sample-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'textile_items_sample.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download sample CSV template');
    }
  };

  const handleCommitImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setErrorNotice('No valid rows available to import.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorNotice(null);
      const res = await api.post('/products/import-csv', { items: validRows });
      setImportResult(res.data);
      setParsedRows([]);
      setFile(null);
    } catch (err: any) {
      setErrorNotice(err.response?.data?.error || 'Failed to import garments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Top Header */}
      <div className="px-8 py-5 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Bulk Garments & Inventory CSV Import</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quickly onboard entire catalogues, size/color variant combinations, and opening stock
          </p>
        </div>

        <button
          onClick={handleDownloadSample}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-2 transition-all"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          Download Sample CSV Template
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {/* Upload Box & Guidelines */}
        <div className="grid grid-cols-3 gap-6">
          {/* File Drop Area (2 Cols) */}
          <div className="col-span-2 bg-white border-2 border-dashed border-slate-300 rounded-3xl p-8 flex flex-col items-center justify-center text-center hover:border-emerald-500 transition-colors">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-sm text-slate-800">
              {file ? file.name : 'Select or Drop your Garments CSV File'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Supports standard CSV format exported from Excel. Blank barcodes will be generated automatically.
            </p>

            <label className="mt-5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer transition-all">
              <span>{file ? 'Choose Different File' : 'Browse CSV File'}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Guidelines Box (1 Col) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              CSV Guidelines
            </h4>
            <ul className="space-y-2 text-slate-600 text-[11px] leading-relaxed">
              <li>• <strong>Required Columns</strong>: `item_code`, `product_name`, `category`, `size`, `color`, `cost_price`, `mrp`, `selling_price`.</li>
              <li>• <strong>Auto-Categorization</strong>: If the category does not exist, it will be created automatically.</li>
              <li>• <strong>Barcodes</strong>: Leave the barcode column empty if you want the system to assign unique 12-digit barcodes.</li>
              <li>• <strong>Existing Items</strong>: If an `item_code` already exists, new variants will be added and stock will be incremented.</li>
            </ul>
          </div>
        </div>

        {/* Success Alert */}
        {importResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{importResult.message}</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorNotice && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorNotice}</span>
            </div>
            <button onClick={() => setErrorNotice(null)} className="font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Parsed Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Parsed Garment Preview ({parsedRows.length} rows)
                </h3>
                <p className="text-xs text-slate-500">
                  <span className="text-emerald-700 font-bold">{validCount} Ready to Import</span>
                  {invalidCount > 0 && (
                    <span className="text-rose-600 font-bold ml-2">• {invalidCount} Invalid Rows</span>
                  )}
                </p>
              </div>

              <button
                onClick={handleCommitImport}
                disabled={isSubmitting || validCount === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing to Database...</span>
                  </>
                ) : (
                  <>
                    <span>Commit {validCount} Items to Inventory</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Item Code</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Size & Color</th>
                    <th className="py-2.5 px-3 text-right">Cost Price</th>
                    <th className="py-2.5 px-3 text-right">MRP</th>
                    <th className="py-2.5 px-3 text-right">Selling Price</th>
                    <th className="py-2.5 px-3 text-center">Disc %</th>
                    <th className="py-2.5 px-3 text-center">Stock</th>
                    <th className="py-2.5 px-3 font-mono">Barcode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40 text-rose-800'}
                    >
                      <td className="py-2 px-3">
                        {row.isValid ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            Valid
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-200 text-rose-800 rounded font-bold text-[10px]">
                            {row.errorReason}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{row.item_code}</td>
                      <td className="py-2 px-3 font-bold text-slate-800">{row.product_name}</td>
                      <td className="py-2 px-3 text-slate-600">
                        {row.category} {row.subcategory ? `> ${row.subcategory}` : ''}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-900">{row.size}</span>
                        <span className="text-slate-500 ml-1">({row.color})</span>
                      </td>
                      <td className="py-2 px-3 text-right">₹{row.cost_price.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-400 line-through">₹{row.mrp.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">
                        ₹{row.selling_price.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center font-semibold">
                        {row.default_discount_pct > 0 ? `${row.default_discount_pct}%` : '—'}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900">{row.stock_quantity}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                        {row.barcode || <span className="text-slate-400 italic">Auto-gen</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
