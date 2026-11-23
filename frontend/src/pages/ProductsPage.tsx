import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Shirt,
  Tag,
  Printer,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react';
import api from '../services/api';
import { Product, ProductVariant, Category, Brand, StoreSettings } from '../types';
import { useAuth } from '../context/AuthContext';
import { BarcodeTagPrintModal } from '../components/common/BarcodeTagPrintModal';

export const ProductsPage: React.FC = () => {
  const { isAdmin } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState<string[]>([]);

  // Barcode Label Print Modal State
  const [printingVariant, setPrintingVariant] = useState<(ProductVariant & { productName?: string; itemCode?: string }) | null>(null);

  // New Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItemCode, setNewItemCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newBrandId, setNewBrandId] = useState('');
  const [newHsnCode, setNewHsnCode] = useState('6205');
  const [newGstRate, setNewGstRate] = useState(5.0);

  // Variant Matrix Generator State
  const [sizesInput, setSizesInput] = useState('M, L, XL');
  const [colorsInput, setColorsInput] = useState('White, Blue');
  const [defaultCostPrice, setDefaultCostPrice] = useState('400');
  const [defaultSellingPrice, setDefaultSellingPrice] = useState('799');
  const [defaultMrp, setDefaultMrp] = useState('999');
  const [matrixVariants, setMatrixVariants] = useState<any[]>([]);

  // Load Initial Data
  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/products', {
        params: { search: search.trim() || undefined, categoryId: selectedCategory || undefined },
      });
      setProducts(res.data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    api.get('/categories').then((res) => setCategories(res.data.categories || [])).catch(console.error);
    api.get('/categories/brands/all').then((res) => setBrands(res.data.brands || [])).catch(console.error);
    api.get('/settings').then((res) => setSettings(res.data.settings)).catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  const toggleExpand = (id: string) => {
    setExpandedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  // Generate Matrix
  const handleGenerateMatrix = () => {
    const sizes = sizesInput.split(',').map((s) => s.trim()).filter(Boolean);
    const colors = colorsInput.split(',').map((c) => c.trim()).filter(Boolean);

    const generated: any[] = [];
    const baseCode = newItemCode.trim().toUpperCase() || 'ITEM';
    let idx = 1;

    sizes.forEach((size) => {
      colors.forEach((color) => {
        const timestamp = Date.now().toString().slice(-4);
        generated.push({
          size,
          color,
          sku: `${baseCode}-${size}-${color}`.replace(/\s+/g, '').toUpperCase(),
          barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          costPrice: parseFloat(defaultCostPrice) || 0,
          mrp: parseFloat(defaultMrp) || 0,
          sellingPrice: parseFloat(defaultSellingPrice) || 0,
          defaultDiscount: 0,
          currentStock: 10,
          lowStockThreshold: 3,
        });
        idx++;
      });
    });

    setMatrixVariants(generated);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemCode || !newName || !newCategoryId || matrixVariants.length === 0) {
      alert('Please fill product details and generate at least one variant');
      return;
    }

    try {
      await api.post('/products', {
        itemCode: newItemCode,
        name: newName,
        categoryId: newCategoryId,
        brandId: newBrandId || null,
        hsnCode: newHsnCode,
        gstRate: newGstRate,
        variants: matrixVariants,
      });

      setIsModalOpen(false);
      // Reset form
      setNewItemCode('');
      setNewName('');
      setMatrixVariants([]);
      loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create product');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Top Header */}
      <div className="px-8 py-5 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Products & Garment Stock</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage master garments, multi-attribute variants (Size & Color), and barcodes
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setIsModalOpen(true);
              if (matrixVariants.length === 0) handleGenerateMatrix();
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add New Garment Master
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="px-8 py-4 flex items-center gap-4 bg-slate-100 border-b border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by garment name, item code, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Product List Table */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Item Code</th>
                <th className="py-3 px-4">Garment Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4 text-center">Variants</th>
                <th className="py-3 px-4 text-center">Total Stock</th>
                <th className="py-3 px-4 text-right">Price Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isExpanded = expandedProductIds.includes(product.id);
                  const minPrice = Math.min(...product.variants.map((v) => Number(v.sellingPrice)));
                  const maxPrice = Math.max(...product.variants.map((v) => Number(v.sellingPrice)));

                  return (
                    <React.Fragment key={product.id}>
                      <tr
                        onClick={() => toggleExpand(product.id)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{product.itemCode}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{product.name}</td>
                        <td className="py-3 px-4">{product.category?.name || '—'}</td>
                        <td className="py-3 px-4 text-slate-500">{product.brand?.name || '—'}</td>
                        <td className="py-3 px-4 text-center font-semibold">{product.variants.length}</td>
                        <td className="py-3 px-4 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] ${
                              (product.totalStock || 0) > 10
                                ? 'bg-emerald-50 text-emerald-700'
                                : (product.totalStock || 0) > 0
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {product.totalStock} units
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                          {minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice} - ₹${maxPrice}`}
                        </td>
                      </tr>

                      {/* Expanded Variants Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={8} className="p-4 pl-14">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                                Available Size & Color Variants ({product.variants.length})
                              </h4>
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                                    <th className="pb-2">Size</th>
                                    <th className="pb-2">Color</th>
                                    <th className="pb-2">Barcode</th>
                                    <th className="pb-2 text-center">Stock</th>
                                    {isAdmin && <th className="pb-2 text-right">Cost Price</th>}
                                    <th className="pb-2 text-right">MRP</th>
                                    <th className="pb-2 text-right">Selling Price</th>
                                    {isAdmin && <th className="pb-2 text-right">Gross Margin</th>}
                                    <th className="pb-2 text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {product.variants.map((v) => (
                                    <tr key={v.id} className="hover:bg-slate-50">
                                      <td className="py-2 font-bold text-slate-900">{v.size}</td>
                                      <td className="py-2 text-slate-600">{v.color}</td>
                                      <td className="py-2 font-mono text-[11px] text-slate-500">{v.barcode}</td>
                                      <td className="py-2 text-center font-bold text-slate-800">{v.currentStock}</td>
                                      {isAdmin && (
                                        <td className="py-2 text-right text-slate-600">₹{v.costPrice}</td>
                                      )}
                                      <td className="py-2 text-right text-slate-400 line-through">₹{v.mrp}</td>
                                      <td className="py-2 text-right font-bold text-emerald-700">₹{v.sellingPrice}</td>
                                      {isAdmin && (
                                        <td className="py-2 text-right font-semibold text-emerald-600">
                                          ₹{v.marginAmount} ({v.marginPercentage})
                                        </td>
                                      )}
                                      <td className="py-2 text-right">
                                        <button
                                          onClick={() =>
                                            setPrintingVariant({
                                              ...v,
                                              productName: product.name,
                                              itemCode: product.itemCode,
                                            })
                                          }
                                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors"
                                        >
                                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                                          Print Tag
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Product Modal with Variant Matrix Generator */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shirt className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Create Garment Master & Variant Matrix</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Garment Details */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Item Code (SKU Prefix) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SHT-500"
                    value={newItemCode}
                    onChange={(e) => setNewItemCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Garment Master Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Men Slim Fit Oxford Shirt"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    required
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Brand (Optional)</label>
                  <select
                    value={newBrandId}
                    onChange={(e) => setNewBrandId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">Select Brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newGstRate}
                    onChange={(e) => setNewGstRate(parseFloat(e.target.value) || 5.0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Variant Matrix Generator Box */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Variant Matrix Generator (Size × Color)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateMatrix}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    Re-Generate Combinations
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sizes (Comma separated)</label>
                    <input
                      type="text"
                      value={sizesInput}
                      onChange={(e) => setSizesInput(e.target.value)}
                      placeholder="e.g. S, M, L, XL"
                      className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Colors (Comma separated)</label>
                    <input
                      type="text"
                      value={colorsInput}
                      onChange={(e) => setColorsInput(e.target.value)}
                      placeholder="e.g. White, Black, Navy"
                      className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Default Cost Price (₹)</label>
                    <input
                      type="number"
                      value={defaultCostPrice}
                      onChange={(e) => setDefaultCostPrice(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Default Selling Price (₹)</label>
                    <input
                      type="number"
                      value={defaultSellingPrice}
                      onChange={(e) => setDefaultSellingPrice(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Default MRP (₹)</label>
                    <input
                      type="number"
                      value={defaultMrp}
                      onChange={(e) => setDefaultMrp(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Generated Variants Preview Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">
                  Generated Variants Preview ({matrixVariants.length} items)
                </h4>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Size</th>
                        <th className="py-2 px-3">Color</th>
                        <th className="py-2 px-3">Barcode</th>
                        <th className="py-2 px-3">Cost Price</th>
                        <th className="py-2 px-3">Selling Price</th>
                        <th className="py-2 px-3">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {matrixVariants.map((mv, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-3 font-bold">{mv.size}</td>
                          <td className="py-1.5 px-3">{mv.color}</td>
                          <td className="py-1.5 px-3 font-mono text-[11px]">{mv.barcode}</td>
                          <td className="py-1.5 px-3">₹{mv.costPrice}</td>
                          <td className="py-1.5 px-3 font-bold text-emerald-700">₹{mv.sellingPrice}</td>
                          <td className="py-1.5 px-3 font-semibold">{mv.currentStock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  Save Garment & All Variants
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Tag Print Modal */}
      <BarcodeTagPrintModal
        isOpen={Boolean(printingVariant)}
        onClose={() => setPrintingVariant(null)}
        variant={printingVariant}
        settings={settings}
      />
    </div>
  );
};
