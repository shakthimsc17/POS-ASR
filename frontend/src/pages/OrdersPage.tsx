import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  Ban,
  Eye,
  CheckCircle,
  X,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import api from '../services/api';
import { Order, StoreSettings } from '../types';
import { useAuth } from '../context/AuthContext';
import { ReceiptPrintModal } from '../components/common/ReceiptPrintModal';

export const OrdersPage: React.FC = () => {
  const { isAdmin } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // View Details Modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Reprint Receipt Modal
  const [reprintOrder, setReprintOrder] = useState<Order | null>(null);

  // Cancellation Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Return / Exchange Modal
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [returnReason, setReturnReason] = useState('Customer Exchange / Fit Issue');

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/sales/orders', {
        params: {
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          paymentMethod: paymentFilter || undefined,
        },
      });
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    api.get('/settings').then((res) => setSettings(res.data.settings)).catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadOrders, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, paymentFilter]);

  const handleOpenDetails = async (orderId: string) => {
    try {
      const res = await api.get(`/sales/orders/${orderId}`);
      setSelectedOrder(res.data.order);
      setIsDetailsOpen(true);
    } catch (err) {
      alert('Failed to load order details');
    }
  };

  const handleOpenCancel = (orderId: string) => {
    setCancelOrderId(orderId);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelOrderId || !cancelReason.trim()) {
      alert('Please specify a mandatory cancellation reason for the audit trail');
      return;
    }

    try {
      await api.post(`/sales/orders/${cancelOrderId}/cancel`, {
        reason: cancelReason.trim(),
      });
      setIsCancelModalOpen(false);
      loadOrders();
      alert('Order cancelled and all garments restocked to inventory!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel order');
    }
  };

  const handleOpenReturn = async (orderId: string) => {
    try {
      const res = await api.get(`/sales/orders/${orderId}`);
      const ord = res.data.order;
      setReturnOrderId(ord.id);
      setReturnItems(
        ord.items.map((i: any) => ({
          orderItemId: i.id,
          productVariantId: i.productVariantId,
          name: i.variant.product.name,
          size: i.variant.size,
          color: i.variant.color,
          purchasedQty: i.quantity,
          returnQty: 0,
          unitRefund: Number(i.netAmount) / i.quantity,
        }))
      );
      setIsReturnModalOpen(true);
    } catch (err) {
      alert('Failed to load order for return');
    }
  };

  const handleConfirmReturn = async () => {
    const itemsToReturn = returnItems
      .filter((i) => i.returnQty > 0)
      .map((i) => ({
        orderItemId: i.orderItemId,
        productVariantId: i.productVariantId,
        quantity: i.returnQty,
        refundAmount: i.returnQty * i.unitRefund,
      }));

    if (itemsToReturn.length === 0) {
      alert('Please select at least 1 unit to return');
      return;
    }

    try {
      await api.post(`/sales/orders/${returnOrderId}/returns`, {
        reason: returnReason,
        items: itemsToReturn,
      });

      setIsReturnModalOpen(false);
      loadOrders();
      alert('Sales return completed and garments returned to inventory stock!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to process return');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="px-8 py-5 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Order History & Sales Invoices</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-protected completed sales, customer returns, reprints, and cancellations
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-8 py-4 flex items-center gap-4 bg-slate-100 border-b border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search invoice number, customer phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700"
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="PARTIALLY_RETURNED">Returned / Exchanged</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700"
        >
          <option value="">All Payment Modes</option>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI / GPay</option>
          <option value="CARD">Card</option>
          <option value="SPLIT">Split Pay</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Salesperson</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Net Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No orders found matching criteria.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{o.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(o.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {o.customer ? `${o.customer.name} (${o.customer.phone})` : 'Walk-in Customer'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{o.user?.employeeName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 font-bold text-[10px] text-slate-700 rounded">
                        {o.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : o.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                      ₹{Number(o.netAmount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenDetails(o.id)}
                        title="View Details"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg inline-flex items-center"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          const res = await api.get(`/sales/orders/${o.id}`);
                          setReprintOrder(res.data.order);
                        }}
                        title="Reprint Bill"
                        className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg inline-flex items-center"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {o.status === 'COMPLETED' && (
                        <>
                          <button
                            onClick={() => handleOpenReturn(o.id)}
                            title="Sales Return / Exchange"
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg inline-flex items-center"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenCancel(o.id)}
                              title="Cancel Order with Reason"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg inline-flex items-center"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal with Cost Snapshot & Profit */}
      {isDetailsOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Invoice Details: {selectedOrder.invoiceNumber}</h3>
                <p className="text-xs text-slate-400">Sold by {selectedOrder.user.employeeName}</p>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Items List */}
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="pb-2">Garment Description</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Selling Price</th>
                    {isAdmin && <th className="pb-2 text-right">Cost Snapshot</th>}
                    <th className="pb-2 text-right">Net</th>
                    {isAdmin && <th className="pb-2 text-right">Gross Profit</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrder.items.map((it: any) => (
                    <tr key={it.id}>
                      <td className="py-2">
                        <div className="font-bold text-slate-900">{it.variant.product.name}</div>
                        <div className="text-[10px] text-slate-500">{it.variant.size} / {it.variant.color}</div>
                      </td>
                      <td className="py-2 text-center font-bold">{it.quantity}</td>
                      <td className="py-2 text-right">₹{Number(it.unitPrice).toFixed(2)}</td>
                      {isAdmin && <td className="py-2 text-right text-slate-500">₹{it.costPriceSnapshot}</td>}
                      <td className="py-2 text-right font-bold text-slate-900">₹{Number(it.netAmount).toFixed(2)}</td>
                      {isAdmin && <td className="py-2 text-right font-bold text-emerald-600">₹{it.itemProfit?.toFixed(2)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Order Total & Admin Profit Box */}
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-200">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{Number(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-₹{(Number(selectedOrder.itemDiscount) + Number(selectedOrder.billDiscount)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                  <span>Net Payable:</span>
                  <span>₹{Number(selectedOrder.netAmount).toFixed(2)}</span>
                </div>
                {isAdmin && (
                  <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-emerald-200">
                    <span>Gross Profit from this Bill:</span>
                    <span>₹{selectedOrder.grossProfit?.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-5 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-rose-700 flex items-center gap-2">
              <Ban className="w-5 h-5" />
              Cancel Invoice & Restock Garments
            </h3>
            <p className="text-xs text-slate-600">
              This invoice will be marked cancelled permanently and stock will be returned to inventory. Silent deletion is forbidden.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mandatory Reason for Cancellation *
              </label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Wrong bill punched, customer declined payment..."
                className="w-full p-3 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
              >
                Close
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-amber-800 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Sales Return & Garment Restock
            </h3>
            <div className="space-y-3">
              {returnItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-[10px] text-slate-500">{item.size} / {item.color} • Purchased: {item.purchasedQty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-600">Return Qty:</span>
                    <input
                      type="number"
                      min="0"
                      max={item.purchasedQty}
                      value={item.returnQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setReturnItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, returnQty: Math.min(val, it.purchasedQty) } : it))
                        );
                      }}
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReturn}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20"
              >
                Process Return & Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reprint Modal */}
      <ReceiptPrintModal
        isOpen={Boolean(reprintOrder)}
        onClose={() => setReprintOrder(null)}
        order={reprintOrder}
        settings={settings}
      />
    </div>
  );
};
