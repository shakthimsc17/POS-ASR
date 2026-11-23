import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Tag, Printer, X } from 'lucide-react';
import { ProductVariant, StoreSettings } from '../../types';

interface BarcodeTagPrintModalProps {
  variant: (ProductVariant & { productName?: string; itemCode?: string }) | null;
  settings: StoreSettings | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeTagPrintModal: React.FC<BarcodeTagPrintModalProps> = ({
  variant,
  settings,
  isOpen,
  onClose,
}) => {
  const [printCopies, setPrintCopies] = useState<number>(1);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (isOpen && variant && variant.barcode && svgRef.current) {
      try {
        JsBarcode(svgRef.current, variant.barcode, {
          format: 'CODE128',
          width: 1.5,
          height: 38,
          displayValue: true,
          fontSize: 10,
          font: 'monospace',
          margin: 0,
        });
      } catch (err) {
        console.error('Error generating barcode:', err);
      }
    }
  }, [isOpen, variant]);

  if (!isOpen || !variant) return null;

  const handlePrint = () => {
    window.print();
  };

  const copiesArray = Array.from({ length: Math.min(Math.max(printCopies, 1), 50) });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-base">Print Garment Barcode Label</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700">Number of Stickers to Print:</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="50"
              value={printCopies}
              onChange={(e) => setPrintCopies(parseInt(e.target.value, 10) || 1)}
              className="w-16 px-2.5 py-1 text-center font-bold border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Printable Label Area */}
        <div className="p-6 bg-slate-200 flex flex-col items-center justify-center max-h-[60vh] overflow-y-auto">
          <div className="printable-area space-y-4">
            {copiesArray.map((_, index) => (
              <div
                key={index}
                className="w-[50mm] h-[28mm] bg-white border border-dashed border-slate-400 p-2 rounded shadow flex flex-col justify-between text-black font-sans box-border"
              >
                {/* Store Name & Item Name */}
                <div className="text-center">
                  <p className="text-[9px] font-bold tracking-wider uppercase truncate">
                    {settings?.storeName || 'ASRTEX TEXTILE'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-900 truncate">
                    {variant.productName || 'Apparel Garment'}
                  </p>
                </div>

                {/* Barcode SVG */}
                <div className="flex justify-center my-0.5">
                  <svg ref={index === 0 ? svgRef : undefined} className="max-w-full" />
                </div>

                {/* Size, Color, MRP and Selling Price */}
                <div className="flex items-end justify-between border-t border-slate-800 pt-0.5 text-[9px]">
                  <div>
                    <span className="font-bold">Size: {variant.size}</span>
                    <span className="ml-1 text-slate-600">({variant.color})</span>
                  </div>
                  <div className="text-right">
                    <span className="line-through text-slate-500 mr-1 text-[8px]">₹{variant.mrp}</span>
                    <span className="font-extrabold text-[10px] text-emerald-800">
                      ₹{variant.sellingPrice}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 shadow-md shadow-emerald-600/20"
          >
            <Printer className="w-4 h-4" />
            Print Stickers ({printCopies})
          </button>
        </div>
      </div>
    </div>
  );
};
