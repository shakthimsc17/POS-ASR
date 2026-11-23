import React, { useEffect, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Tag, Printer, X, RotateCw, ArrowUp, Check } from 'lucide-react';
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
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');
  const [orientation, setOrientation] = useState<'landscape' | 'rotated'>('landscape');
  // Vertical position offset to protect against bottom cutoff on Seznik 2" printer
  const [verticalPosition, setVerticalPosition] = useState<'top-safe' | 'high' | 'center'>('top-safe');
  // Horizontal shift to align with Seznik paper roll feeding
  const [horizontalShift, setHorizontalShift] = useState<'left-safe' | 'left-more' | 'center'>('left-safe');

  const labelWidth = settings?.barcodeLabelWidth || 50; // mm
  const labelHeight = settings?.barcodeLabelHeight || 25; // mm

  useEffect(() => {
    if (isOpen && variant && variant.barcode) {
      try {
        const canvas = document.createElement('canvas');
        // Professional retail barcode: taller high-contrast bars
        JsBarcode(canvas, variant.barcode, {
          format: 'CODE128',
          width: 2.0, // High-contrast, dense bars for fast scanner reads
          height: 48, // Increased vertical bar height for professional scan readability
          displayValue: false, // Text is rendered via native HTML for 100% vector clarity
          margin: 0,
        });
        setBarcodeDataUrl(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('Error generating barcode:', err);
      }
    }
  }, [isOpen, variant]);

  if (!isOpen || !variant) return null;

  const handlePrint = () => {
    window.print();
  };

  const copiesCount = Math.min(Math.max(printCopies, 1), 50);
  const copiesArray = Array.from({ length: copiesCount });

  // Bottom padding to lift content away from Seznik bottom tear bar
  const bottomPaddingMm =
    verticalPosition === 'high' ? '4.5mm' : verticalPosition === 'top-safe' ? '2.8mm' : '1.5mm';
  const topPaddingMm =
    verticalPosition === 'high' ? '0.5mm' : verticalPosition === 'top-safe' ? '0.8mm' : '1.5mm';

  // Left & right padding to shift content slightly to the left
  const leftPaddingMm =
    horizontalShift === 'left-more' ? '0.3mm' : horizontalShift === 'left-safe' ? '0.8mm' : '2mm';
  const rightPaddingMm =
    horizontalShift === 'left-more' ? '3.7mm' : horizontalShift === 'left-safe' ? '3.2mm' : '2mm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      {/* Scoped Thermal Label Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: ${orientation === 'landscape' ? `${labelWidth}mm ${labelHeight}mm` : `${labelHeight}mm ${labelWidth}mm`};
            margin: 0mm;
          }
          body * {
            visibility: hidden !important;
          }
          .barcode-print-wrapper, .barcode-print-wrapper * {
            visibility: visible !important;
          }
          .barcode-print-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }
          .barcode-label-sticker {
            width: ${labelWidth}mm !important;
            height: ${labelHeight}mm !important;
            max-width: ${labelWidth}mm !important;
            max-height: ${labelHeight}mm !important;
            margin: 0 !important;
            padding-top: ${topPaddingMm} !important;
            padding-left: ${leftPaddingMm} !important;
            padding-right: ${rightPaddingMm} !important;
            padding-bottom: ${bottomPaddingMm} !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            ${
              orientation === 'rotated'
                ? `transform: rotate(90deg) translate(0, -${labelWidth}mm); transform-origin: top left;`
                : ''
            }
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base leading-none">Barcode Sticker Print</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Seznik 2" Roll Printer ({labelWidth}mm × {labelHeight}mm)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Controls */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-4 gap-2">
          {/* Quantity */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Copies:</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPrintCopies((c) => Math.max(1, c - 1))}
                className="w-6 h-7 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-black text-xs"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="50"
                value={printCopies}
                onChange={(e) => setPrintCopies(parseInt(e.target.value, 10) || 1)}
                className="w-10 h-7 text-center font-black border border-slate-300 rounded text-xs"
              />
              <button
                type="button"
                onClick={() => setPrintCopies((c) => Math.min(50, c + 1))}
                className="w-6 h-7 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-black text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Horizontal Shift Control (User's request to move little bit left) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Horiz Shift:</label>
            <select
              value={horizontalShift}
              onChange={(e) => setHorizontalShift(e.target.value as any)}
              className="w-full h-7 px-1 border border-slate-300 rounded text-[11px] font-bold text-slate-700 bg-white"
            >
              <option value="left-safe">Left (-1.2mm)</option>
              <option value="left-more">Left (-1.8mm)</option>
              <option value="center">Center (0mm)</option>
            </select>
          </div>

          {/* Vertical Lift Control (Seznik Tear-Bar Safety) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Vert Lift:</label>
            <select
              value={verticalPosition}
              onChange={(e) => setVerticalPosition(e.target.value as any)}
              className="w-full h-7 px-1 border border-slate-300 rounded text-[11px] font-bold text-slate-700 bg-white"
            >
              <option value="top-safe">Safe (+3mm)</option>
              <option value="high">High (+4.5mm)</option>
              <option value="center">Center</option>
            </select>
          </div>

          {/* Orientation */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Rotate:</label>
            <button
              type="button"
              onClick={() => setOrientation((o) => (o === 'landscape' ? 'rotated' : 'landscape'))}
              className={`w-full h-7 px-1 rounded text-[11px] font-bold border flex items-center justify-center gap-1 transition-all ${
                orientation === 'landscape'
                  ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  : 'bg-emerald-600 text-white border-emerald-600'
              }`}
            >
              <RotateCw className="w-3 h-3" />
              {orientation === 'landscape' ? 'Standard' : 'Rotated'}
            </button>
          </div>
        </div>

        {/* Informative Sticker Guide */}
        <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
          <div className="flex items-center gap-1.5">
            <ArrowUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Text content <strong>lifted up</strong> to prevent bottom tear-bar cutoff on Seznik printers.
            </span>
          </div>
          <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold shrink-0">
            1 Label / Click
          </span>
        </div>

        {/* Printable Label Preview Area */}
        <div className="p-6 bg-slate-200 flex flex-col items-center justify-center max-h-[50vh] overflow-y-auto">
          <div className="text-center mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Exact Seznik 2" Preview ({labelWidth}mm × {labelHeight}mm)
            </span>
          </div>

          <div className="barcode-print-wrapper flex flex-col items-center space-y-3">
            {copiesArray.map((_, index) => (
              <div
                key={index}
                style={{
                  paddingTop: topPaddingMm,
                  paddingBottom: bottomPaddingMm,
                  paddingLeft: leftPaddingMm,
                  paddingRight: rightPaddingMm,
                }}
                className="barcode-label-sticker w-[50mm] h-[25mm] max-w-[50mm] max-h-[25mm] bg-white border border-slate-400 rounded shadow flex flex-col justify-start text-black font-sans box-border overflow-hidden select-none"
              >
                {/* Top Row: Store Name & Garment Name (Uniform text-xs font) */}
                <div className="flex items-center justify-between leading-none pb-0.5 border-b border-black">
                  <span className="text-xs font-black tracking-tight uppercase truncate max-w-[22mm] text-black">
                    {settings?.storeName || 'ASRTEX'}
                  </span>
                  <span className="text-xs font-black text-black uppercase truncate max-w-[24mm] text-right">
                    {variant.productName || 'Garment'}
                  </span>
                </div>

                {/* Middle: Taller High-Contrast Barcode Bars */}
                <div className="flex justify-center items-center my-0.5 h-[11mm] overflow-hidden">
                  {barcodeDataUrl ? (
                    <img
                      src={barcodeDataUrl}
                      alt={variant.barcode}
                      className="h-[11mm] max-w-[46mm] object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <span className="text-xs text-slate-400">Generating...</span>
                  )}
                </div>

                {/* Native Vector Monospace Barcode Number (Uniform text-xs font) */}
                <div className="text-center font-mono font-black text-xs tracking-widest text-black leading-none mb-0.5">
                  {variant.barcode}
                </div>

                {/* Bottom Row: Size, Color, MRP and Selling Price (Uniform text-xs font) */}
                <div className="flex items-center justify-between border-t-2 border-black pt-0.5 leading-none">
                  <div className="text-xs font-black text-black truncate max-w-[24mm]">
                    Size: <span className="font-black">{variant.size}</span>
                    <span className="font-bold ml-1 text-slate-800">({variant.color})</span>
                  </div>
                  <div className="text-right leading-none flex items-baseline gap-1.5 text-xs">
                    {Number(variant.mrp) > Number(variant.sellingPrice) && (
                      <span className="line-through text-black font-bold">
                        ₹{variant.mrp}
                      </span>
                    )}
                    <span className="font-black text-black">
                      ₹{variant.sellingPrice}
                    </span>
                  </div>
                </div>

                {/* Protected bottom margin buffer against Seznik cutter/tear line */}
                <div className="flex-1"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Ready to print: <strong className="text-slate-900">{copiesCount} label</strong>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print {copiesCount === 1 ? '1 Barcode Sticker' : `${copiesCount} Stickers`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
