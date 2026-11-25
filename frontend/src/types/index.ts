export interface User {
  id: string;
  employeeName: string;
  email?: string;
  username: string;
  role: 'ADMIN' | 'SALESPERSON';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  parent?: { id: string; name: string };
  subCategories?: Array<{ id: string; name: string; status: boolean }>;
  status: boolean;
  _count?: { products: number };
}

export interface Brand {
  id: string;
  name: string;
  status: boolean;
  _count?: { products: number };
}

export interface ProductVariant {
  id: string;
  productId: string;
  size: string;
  color: string;
  sku: string;
  barcode: string;
  costPrice?: number; // Only returned to ADMIN
  mrp: number;
  sellingPrice: number;
  defaultDiscount: number;
  currentStock: number;
  lowStockThreshold: number;
  marginAmount?: number;
  marginPercentage?: string;
  product?: Product;
}

export interface Product {
  id: string;
  itemCode: string;
  name: string;
  description?: string;
  categoryId: string;
  category?: Category;
  brandId?: string | null;
  brand?: Brand | null;
  hsnCode?: string;
  gstRate: number;
  status: boolean;
  totalStock?: number;
  variants: ProductVariant[];
  createdAt: string;
}

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  itemCode: string;
  size: string;
  color: string;
  barcode: string;
  unitPrice: number;
  mrp: number;
  quantity: number;
  discountAmount: number;
  taxAmount: number;
  gstRate: number;
  availableStock: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
  totalPurchases: number;
}

export interface OrderItem {
  id: string;
  productVariantId: string;
  variant: ProductVariant & {
    product: {
      name: string;
      itemCode: string;
      hsnCode?: string;
      gstRate: number;
    };
  };
  quantity: number;
  mrpSnapshot: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  costPriceSnapshot?: number;
  itemProfit?: number;
}

export interface OrderExchangeDetail {
  id: string;
  variantId: string;
  productName: string;
  itemCode: string;
  size: string;
  color: string;
  barcode: string;
  quantity: number;
  unitCost?: number;
  unitSelling: number;
  notes?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customer?: Customer;
  userId: string;
  user: { id: string; employeeName: string };
  subtotal: number;
  itemDiscount: number;
  billDiscount: number;
  taxAmount: number;
  netAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'SPLIT';
  cashPaid?: number;
  digitalPaid?: number;
  status: 'COMPLETED' | 'CANCELLED' | 'RETURNED' | 'PARTIALLY_RETURNED';
  cancellationReason?: string;
  createdAt: string;
  items: OrderItem[];
  returns?: Array<{ id?: string; refundAmount: number; reason: string; createdAt?: string }>;
  exchangeDetails?: OrderExchangeDetail[];
  totalExchangeCredit?: number;
  restockedCost?: number;
  soldItemsProfit?: number;
  netBillProfit?: number;
  totalCogs?: number;
  grossProfit?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  _count?: { purchases: number };
}

export interface PurchaseItem {
  id: string;
  productVariantId: string;
  variant: ProductVariant & {
    product: { name: string; itemCode: string };
  };
  quantity: number;
  costPricePerUnit: number;
  totalCost: number;
}

export interface Purchase {
  id: string;
  purchaseInvoice: string;
  supplierId: string;
  supplier: Supplier;
  purchaseDate: string;
  totalAmount: number;
  notes?: string;
  receivedBy: { id: string; employeeName: string };
  items: PurchaseItem[];
}

export interface Expense {
  id: string;
  name: string;
  categoryId: string;
  category: { id: string; name: string };
  amount: number;
  expenseDate: string;
  paymentType: string;
  notes?: string;
  recordedBy: { id: string; employeeName: string };
}

export interface StoreSettings {
  id: number;
  storeName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
  gstin?: string;
  gstEnabled: boolean;
  currency: string;
  currencySymbol: string;
  invoicePrefix: string;
  nextInvoiceNum: number;
  receiptFooter: string;
  receiptPaperSize: '58mm' | '80mm';
  printShopLogo: boolean;
  printGstDetails: boolean;
  showMrpOnReceipt: boolean;
  barcodeLabelWidth: number;
  barcodeLabelHeight: number;
}
