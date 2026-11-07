"use client";

import { useState, useEffect } from "react";
import { money } from "@/lib/format";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FFD84D",
  paid: "#7CE7FF",
  packed: "#7C5CFF",
  shipped: "#6366F1",
  delivered: "#D6FF3E",
  cancelled: "#CBD5E1",
  refunded: "#FF6B5E"
};

const STATUS_META: Record<string, { label: string; pill: string }> = {
  pending: { label: "Awaiting payment", pill: "bg-butter text-ink" },
  paid: { label: "Paid", pill: "bg-aqua text-ink" },
  packed: { label: "Packed", pill: "bg-iris text-white" },
  shipped: { label: "Shipped", pill: "bg-indigo-500 text-white" },
  delivered: { label: "Delivered", pill: "bg-acid text-ink" },
  cancelled: { label: "Cancelled", pill: "bg-ink/10 text-ink/55" },
  refunded: { label: "Refunded", pill: "bg-coral text-white" }
};

const ALL_STATUSES = ["pending", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"];

interface OrderItem {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export default function OrdersContent() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // Detail modal state
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailItems, setDetailItems] = useState<OrderItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Item popup state
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);

  // Status update in-row state
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [page, status, search]);

  async function loadOrders() {
    const params = new URLSearchParams({
      status,
      q: search,
      page: String(page),
      limit: "20"
    });
    const res = await fetch(`/api/admin/orders?${params}`);
    const data = await res.json();
    setOrders(data.items || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setStatusCounts(data.statusCounts || {});
  }

  async function openDetail(orderId: string) {
    setSelectedOrder(null);
    setDetailItems([]);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const data = await res.json();
      if (data.order) {
        setSelectedOrder(data.order);
        setDetailItems(data.items || []);
      }
    } catch (e) {
      console.error("Failed to load order detail", e);
    } finally {
      setDetailLoading(false);
    }
  }

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdatingStatus(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await loadOrders();
        // Refresh detail if modal is open
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      }
    } catch (e) {
      console.error("Failed to update status", e);
    } finally {
      setUpdatingStatus(null);
    }
  }

  const statusTabs = ["all", "open", "pending", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"];
  const statusLabels: Record<string, string> = {
    all: "All", open: "Open", pending: "Pending", paid: "Paid",
    packed: "Packed", shipped: "Shipped", delivered: "Delivered",
    cancelled: "Cancelled", refunded: "Refunded"
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {statusTabs.map((s) => {
              const count = s === "all"
                ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
                : s === "open"
                ? (statusCounts.pending || 0) + (statusCounts.paid || 0) + (statusCounts.packed || 0) + (statusCounts.shipped || 0)
                : statusCounts[s] || 0;
              return (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setPage(1); }}
                  className={`chip ${status === s ? "chip-active" : ""}`}
                >
                  {statusLabels[s]}
                  <span className="ml-1 text-[11px] font-black">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search order no, email, name…"
              className="input !py-2.5 w-full text-sm sm:w-72"
            />
            <a href="/api/admin/export/orders.csv" className="btn-outline btn-sm">⬇ CSV</a>
          </div>
        </div>
      </div>

      {/* Orders table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/8 bg-mist/60 text-[11px] font-black uppercase tracking-wider text-ink/45">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 min-w-[180px]">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/6">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm font-bold text-ink/45">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-mist/60 transition">
                    {/* Order # - clickable for detail modal */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetail(o.id)}
                        className="font-mono text-xs font-bold text-ink/70 underline cursor-pointer"
                      >
                        #{o.orderNumber}
                      </button>
                    </td>
                    {/* Customer */}
                    <td className="px-4 py-3">
                      <span className="block font-extrabold text-ink">{o.name}</span>
                      <span className="block text-[11px] font-bold text-ink/45">{o.email}</span>
                    </td>
                    {/* Items - show item names with emojis and quantities */}
                    <td className="px-4 py-3">
                      <div style={{ gap: "2px" }}>
                        {(o.items || []).slice(0, 2).map((item: OrderItem, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedItem(item)}
                            className="block w-full text-left text-xs font-medium text-ink/70 leading-snug hover:text-iris cursor-pointer rounded px-1 -mx-1"
                          >
                            <span className="mr-1">{item.emoji || "🎁"}</span>
                            <span className="truncate inline-block align-bottom max-w-[140px]">{item.name}</span>
                            <span className="text-ink/45 ml-1">×{item.qty}</span>
                          </button>
                        ))}
                        {(o.items || []).length > 2 && (
                          <div className="text-[11px] font-bold text-ink/45">
                            +{(o.items || []).length - 2} more
                          </div>
                        )}
                        {(o.items || []).length === 0 && (
                          <div className="text-xs font-bold text-ink/55">{o.itemCount} items</div>
                        )}
                      </div>
                    </td>
                    {/* Total */}
                    <td className="px-4 py-3 font-black tabular">{money(o.totalCents)}</td>
                    {/* Status dropdown */}
                    <td className="px-4 py-3">
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        disabled={updatingStatus === o.id}
                        className={`status-pill text-xs font-bold cursor-pointer appearance-none px-2 py-1 pr-6 rounded-full ${STATUS_META[o.status]?.pill || "bg-ink/10 text-ink/60"}`}
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                      >
                        {ALL_STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_META[s]?.label}</option>
                        ))}
                      </select>
                      {updatingStatus === o.id && (
                        <div className="mt-1 text-[10px] font-bold text-ink/50 animate-pulse">Updating…</div>
                      )}
                    </td>
                    {/* Payment */}
                    <td className="px-4 py-3">
                      <span className="block text-xs font-extrabold uppercase text-ink/60">{o.paymentMethod || "card"}</span>
                      <span className="block text-[11px] font-bold text-ink/45">{o.paymentStatus || ""}</span>
                    </td>
                    {/* Placed date */}
                    <td className="px-4 py-3 text-xs font-bold text-ink/55">
                      {new Date(o.placedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 px-4 py-3 text-sm font-bold text-ink/55">
          <span>
            {page > 0 && `Showing ${(page - 1) * 20 + 1}-${Math.min(page * 20, total)} of ${total}`}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="btn-outline btn-sm"
            >
              ← Prev
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}
              className="btn-outline btn-sm"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />

          {/* Modal panel */}
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-sticker max-h-[80vh] overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-ink/8 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="font-black text-base text-ink">
                  Order <span className="font-mono text-iris">{selectedOrder.orderNumber}</span>
                </h2>
                <p className="text-[11px] font-bold text-ink/50 mt-1">
                  {new Date(selectedOrder.placedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="btn-ghost w-8 h-8 flex items-center justify-center rounded-full text-ink/50 hover:text-ink"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6" style={{ gap: "1rem" }}>
              {/* Status badge */}
              <div className="flex items-center gap-2">
                <span className={`status-pill text-xs font-bold px-3 py-1.5 ${STATUS_META[selectedOrder.status]?.pill || "bg-ink/10 text-ink/60"}`}>
                  {STATUS_META[selectedOrder.status]?.label || selectedOrder.status}
                </span>
                <span className="text-[11px] font-bold text-ink/45 uppercase tracking-wide">{selectedOrder.payment.method}</span>
              </div>

              {/* Customer info */}
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-ink/45 mb-2">Customer</div>
                <div className="text-sm" style={{ gap: "0.5rem" }}>
                  <div className="font-extrabold text-ink">{selectedOrder.customer.name}</div>
                  <div className="text-xs font-bold text-ink/60">{selectedOrder.customer.email}</div>
                  {selectedOrder.customer.phone && (
                    <div className="text-xs font-bold text-ink/60">{selectedOrder.customer.phone}</div>
                  )}
                  {selectedOrder.customer.address && (
                    <div className="text-xs font-bold text-ink/50 mt-1">{selectedOrder.customer.address}</div>
                  )}
                </div>
              </div>

              {/* Items list */}
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-ink/45 mb-2">Items ({detailItems.length})</div>
                {detailItems.length === 0 && (
                  <div className="text-xs font-bold text-ink/50 italic">No items found</div>
                )}
                {detailItems.length > 0 && (
                  <div className="space-y-2" style={{ gap: "0.5rem" }}>
                    {detailItems.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 p-3 bg-mist/40 rounded-xl">
                        <div className="text-2xl leading-none">{item.emoji || "🎁"}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm text-ink truncate">{item.name}</div>
                          <div className="text-[11px] font-bold text-ink/50">Qty: {item.qty}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-sm text-ink">{money(item.lineTotalCents)}</div>
                          <div className="text-[11px] font-bold text-ink/45">{money(item.unitPriceCents)} each</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pricing breakdown */}
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-ink/45 mb-2">Summary</div>
                <div className="space-y-1 text-sm font-bold text-ink/70">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{money(selectedOrder.pricing.subtotalCents)}</span>
                  </div>
                  {selectedOrder.pricing.discountCents > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{money(selectedOrder.pricing.discountCents)}</span>
                    </div>
                  )}
                  {selectedOrder.pricing.shippingCents > 0 && (
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>{money(selectedOrder.pricing.shippingCents)}</span>
                    </div>
                  )}
                  {selectedOrder.pricing.taxCents > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{money(selectedOrder.pricing.taxCents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-base pt-2 border-t border-ink/10">
                    <span>Total</span>
                    <span className="text-iris">{money(selectedOrder.pricing.totalCents)}</span>
                  </div>
                </div>
              </div>

              {/* Fulfillment info */}
              {(selectedOrder.fulfillment.carrier || selectedOrder.fulfillment.trackingNumber) && (
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-ink/45 mb-2">Fulfillment</div>
                  <div className="text-sm font-bold text-ink/70" style={{ gap: "0.25rem" }}>
                    {selectedOrder.fulfillment.carrier && (
                      <div>Carrier: {selectedOrder.fulfillment.carrier}</div>
                    )}
                    {selectedOrder.fulfillment.trackingNumber && (
                      <div>Tracking: {selectedOrder.fulfillment.trackingNumber}</div>
                    )}
                    {selectedOrder.fulfillment.note && (
                      <div className="text-xs font-bold text-ink/50 italic mt-2">{selectedOrder.fulfillment.note}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Item Popup Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          />
          <div className="relative w-full max-w-xs bg-white rounded-2xl shadow-sticker overflow-hidden">
            {/* Product image */}
            <div className="relative h-48 overflow-hidden rounded-2xl">
              <img
                src={`/assets/img/products/${selectedItem.slug || "smoke-test-gift"}.svg`}
                alt={selectedItem.name}
                className="h-full w-full object-cover"
                width={400}
                height={300}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-ink/40" />
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-ink text-sm font-bold"
              >
                ✕
              </button>
            </div>
            {/* Content */}
            <div className="p-4" style={{ gap: "0.75rem" }}>
              <div className="flex items-start gap-2">
                <span className="text-2xl">{selectedItem.emoji || "🎁"}</span>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm text-ink truncate">{selectedItem.name}</h3>
                  <span className="text-[11px] font-bold text-ink/45">{selectedItem.slug || ""}</span>
                </div>
              </div>
              <div className="flex items-center justify-between bg-mist/40 rounded-xl px-3 py-2">
                <span className="text-[11px] font-bold text-ink/55 uppercase tracking-wide">Quantity</span>
                <span className="font-black text-base text-ink">×{selectedItem.qty}</span>
              </div>
              <div className="flex items-center justify-between bg-mist/40 rounded-xl px-3 py-2">
                <span className="text-[11px] font-bold text-ink/55 uppercase tracking-wide">Unit Price</span>
                <span className="font-black text-base text-ink">{money(selectedItem.unitPriceCents)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-ink/10 pt-2">
                <span className="text-[11px] font-bold text-ink/55 uppercase tracking-wide">Line Total</span>
                <span className="font-black text-lg text-iris">{money(selectedItem.lineTotalCents)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
