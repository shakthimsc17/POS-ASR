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
  Edit3,
  Trash2,
  FolderPlus,
  History,
} from 'lucide-react';
import api from '../services/api';
import { Product, ProductVariant, Category, Brand, StoreSettings } from '../types';
import { useAuth } from '../context/AuthContext';
import { BarcodeTagPrintModal } from '../components/common/BarcodeTagPrintModal';
import { QuickCategoryModal } from '../components/common/QuickCategoryModal';
import { QuickBrandModal } from '../components/common/QuickBrandModal';
import { VariantStockHistoryModal } from '../components/common/VariantStockHistoryModal';

export const ProductsPage: React.FC = () => {
  const { isAdmin } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Category & Brand Creation Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

  // Variant Stock Audit History
  const [selectedHistoryVariant, setSelectedHistoryVariant] = useState<any | null>(null);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState<string[]>([]);

  // Barcode Label Print Modal State
  const [printingVariant, setPrintingVariant] = useState<(ProductVariant & { productName?: string; itemCode?: string }) | null>(null);

  // Edit Garment Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editBrandId, setEditBrandId] = useState('');
  const [editStatus, setEditStatus] = useState(true);
  const [editVariants, setEditVariants] = useState<any[]>([]);

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
  const [defaultDiscountPct, setDefaultDiscountPct] = useState('0');
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
    api.get('/settings').then((res) => {
      setSettings(res.data.settings);
      if (!res.data.settings?.gstEnabled) {
        setNewGstRate(0);
      }
    }).catch(console.error);
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
          defaultDiscount: parseFloat(defaultDiscountPct) || 0,
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

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCategoryId(product.categoryId);
    setEditBrandId(product.brandId || '');
    setEditStatus(product.status);
    setEditVariants(
      product.variants.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        barcode: v.barcode,
        costPrice: v.costPrice ?? 0,
        mrp: v.mrp,
        sellingPrice: v.sellingPrice,
        defaultDiscount: v.defaultDiscount || 0,
        currentStock: v.currentStock,
      }))
    );
    setIsEditModalOpen(true);
  };

  const handleAddNewVariantRow = () => {
    setEditVariants((prev) => [
      ...prev,
      {
        size: 'Free Size',
        color: 'Standard',
        barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        costPrice: 400,
        mrp: 999,
        sellingPrice: 799,
        defaultDiscount: 0,
        currentStock: 0,
      },
    ]);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editName.trim() || !editCategoryId) {
      alert('Please fill garment name and category');
      return;
    }

    try {
      await api.put(`/products/${editingProduct.id}`, {
        name: editName.trim(),
        categoryId: editCategoryId,
        brandId: editBrandId || null,
        status: editStatus,
        variants: editVariants,
      });

      setIsEditModalOpen(false);
      setEditingProduct(null);
      loadProducts();
      alert('Garment details and variants updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update garment');
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
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <FolderPlus className="w-4 h-4 text-emerald-600" />
              + Add Category
            </button>
            <button
              onClick={() => setIsBrandModalOpen(true)}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Tag className="w-4 h-4 text-emerald-600" />
              + Add Brand
            </button>
            <button
              onClick={() => {
                setIsModalOpen(true);
                if (matrixVariants.length === 0) handleGenerateMatrix();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New Garment Master
            </button>
          </div>
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
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-slate-400">
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
                        {isAdmin && (
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(product);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors border border-slate-200"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>

                      {/* Expanded Variants Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={isAdmin ? 9 : 8} className="p-4 pl-14">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                  Available Size & Color Variants ({product.variants.length})
                                </h4>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleOpenEdit(product)}
                                    className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors border border-emerald-200"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Edit Garment & Pricing
                                  </button>
                                )}
                              </div>
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
                                    <th className="pb-2 text-center">Disc %</th>
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
                                      <td className="py-2 text-center font-semibold text-emerald-600">
                                        {Number(v.defaultDiscount) > 0 ? `${v.defaultDiscount}%` : '—'}
                                      </td>
                                      {isAdmin && (
                                        <td className="py-2 text-right font-semibold text-emerald-600">
                                          ₹{v.marginAmount} ({v.marginPercentage})
                                        </td>
                                      )}
                                      <td className="py-2 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedHistoryVariant({
                                                id: v.id,
                                                productName: product.name,
                                                itemCode: product.itemCode,
                                                size: v.size,
                                                color: v.color,
                                                barcode: v.barcode,
                                                currentStock: v.currentStock,
                                              });
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                                            title="Inspect stock audit ledger"
                                          >
                                            <History className="w-3.5 h-3.5" />
                                          </button>
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
                                        </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Category *</label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Brand (Optional)</label>
                    <button
                      type="button"
                      onClick={() => setIsBrandModalOpen(true)}
                      className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
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

                {settings?.gstEnabled && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">GST Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newGstRate}
                      onChange={(e) => setNewGstRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                    />
                  </div>
                )}
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

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Default Cost (₹)</label>
                    <input
                      type="number"
                      value={defaultCostPrice}
                      onChange={(e) => setDefaultCostPrice(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs"
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
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      value={defaultSellingPrice}
                      onChange={(e) => setDefaultSellingPrice(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Default Disc (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={defaultDiscountPct}
                      onChange={(e) => setDefaultDiscountPct(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-600"
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
                        <th className="py-2 px-3 text-center">Disc %</th>
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
                          <td className="py-1.5 px-3 text-center font-bold text-emerald-600">
                            {mv.defaultDiscount > 0 ? `${mv.defaultDiscount}%` : '—'}
                          </td>
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

      {/* Edit Garment Master & Variants Modal */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base">Edit Garment: {editingProduct.name}</h3>
                  <p className="text-[11px] text-slate-400">
                    SKU Code: <span className="font-mono text-emerald-300 font-bold">{editingProduct.itemCode}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Garment Master Info */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Garment Master Details</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Item Code</label>
                    <input
                      type="text"
                      disabled
                      value={editingProduct.itemCode}
                      className="w-full px-3 py-2 bg-slate-200 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Garment Master Name *</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                    <select
                      value={editStatus ? 'active' : 'inactive'}
                      onChange={(e) => setEditStatus(e.target.value === 'active')}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Category *</label>
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    <select
                      required
                      value={editCategoryId}
                      onChange={(e) => setEditCategoryId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Brand (Optional)</label>
                      <button
                        type="button"
                        onClick={() => setIsBrandModalOpen(true)}
                        className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    <select
                      value={editBrandId}
                      onChange={(e) => setEditBrandId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
                    >
                      <option value="">No Brand / Generic</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Variants & Pricing Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Variants & Pricing ({editVariants.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Edit size, color, barcode, cost price, MRP, selling price, and default discount %.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewVariantRow}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 border border-emerald-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Variant
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Color</th>
                        <th className="py-2.5 px-3">Barcode</th>
                        {isAdmin && <th className="py-2.5 px-3 text-right">Cost (₹)</th>}
                        <th className="py-2.5 px-3 text-right">MRP (₹)</th>
                        <th className="py-2.5 px-3 text-right">Selling (₹)</th>
                        <th className="py-2.5 px-3 text-center">Disc %</th>
                        <th className="py-2.5 px-3 text-center">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editVariants.map((v, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={v.size}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditVariants((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, size: val } : item))
                                );
                              }}
                              className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={v.color}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditVariants((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, color: val } : item))
                                );
                              }}
                              className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-xs"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={v.barcode}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditVariants((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, barcode: val } : item))
                                );
                              }}
                              className="w-32 px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono"
                            />
                          </td>
                          {isAdmin && (
                            <td className="py-2 px-2 text-right">
                              <input
                                type="number"
                                step="any"
                                value={v.costPrice}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditVariants((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, costPrice: val } : item))
                                  );
                                }}
                                className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs text-right font-medium"
                              />
                            </td>
                          )}
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              step="any"
                              value={v.mrp}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setEditVariants((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, mrp: val } : item))
                                );
                              }}
                              className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs text-right font-medium text-slate-700"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              step="any"
                              value={v.sellingPrice}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setEditVariants((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, sellingPrice: val } : item))
                                );
                              }}
                              className="w-20 px-2 py-1 border border-emerald-300 rounded-lg text-xs text-right font-bold text-emerald-800"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={v.defaultDiscount || 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setEditVariants((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, defaultDiscount: val } : item))
                                );
                              }}
                              className="w-16 px-2 py-1 border border-emerald-300 rounded-lg text-xs text-center font-bold text-emerald-600"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span
                              className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold text-[11px]"
                              title="Stock is updated via Purchases or Adjustments"
                            >
                              {v.currentStock ?? 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">
                  * Note: Stock quantities cannot be overwritten directly. They are maintained automatically through Purchase Entries and Stock Adjustments for inventory audit integrity.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                >
                  Update Garment Master & Variants
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

      {/* Quick Category Modal */}
      <QuickCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        existingCategories={categories}
        onCategoryCreated={(newCat) => {
          setCategories((prev) => {
            const exists = prev.some((c) => c.id === newCat.id);
            return exists ? prev : [...prev, newCat];
          });
          if (isModalOpen) setNewCategoryId(newCat.id);
          if (isEditModalOpen) setEditCategoryId(newCat.id);
        }}
      />

      {/* Quick Brand Modal */}
      <QuickBrandModal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        onBrandCreated={(newBrand) => {
          setBrands((prev) => {
            const exists = prev.some((b) => b.id === newBrand.id);
            return exists ? prev : [...prev, newBrand];
          });
          if (isModalOpen) setNewBrandId(newBrand.id);
          if (isEditModalOpen) setEditBrandId(newBrand.id);
        }}
      />
      {/* Variant Stock Audit History Modal */}
      <VariantStockHistoryModal
        isOpen={Boolean(selectedHistoryVariant)}
        onClose={() => setSelectedHistoryVariant(null)}
        variant={selectedHistoryVariant}
      />
    </div>
  );
};
