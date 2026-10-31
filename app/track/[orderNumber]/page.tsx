import Link from "next/link";
import { money } from "@/lib/format";
import { getOrderByNumber } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function OrderTrackingPage(
  { params: { orderNumber } }: { params: { orderNumber: string } }
) {
  // Get email from query params or use demo
  const searchParams = new URLSearchParams();
  const email = searchParams.get("email") || "";

  const order = await getOrderByNumber(orderNumber, email);

  if (!order) {
    return (
      <main className="container-cc pb-20 pt-8">
        <div className="max-w-md mx-auto p-8 text-center">
          <span className="text-6xl mb-4">🔍</span>
          <h1 className="font-display text-4xl font-extrabold mb-4">
            Order Not Found
          </h1>
          <p className="text-ink/60 mb-6">
            We couldn't find an order with that order number and email combination.
          </p>
          <Link href="/" className="btn-lime px-6 py-3">
            Start shopping
          </Link>
        </div>
      </main>
    );
  }

  const statusClass = {
    pending: "bg-ink/10 text-ink/70",
    paid: "bg-acid text-ink",
    packed: "bg-iris text-ink",
    shipped: "border-iris text-iris",
    delivered: "bg-green-100 text-green-900",
    cancelled: "bg-red-100 text-red-900",
    refunded: "bg-purple-100 text-purple-900",
  }[order.status] || "text-ink";

  const statusLabel = {
    pending: "Pending",
    paid: "Paid",
    packed: "Packed",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
  }[order.status] || "Unknown";

  return (
    <main className="container-cc pb-20 pt-8">
      <nav className="text-xs font-bold text-ink/45" aria-label="Breadcrumb">
        <Link href="/" className="transition hover:text-ink">Home</Link>{" "}
        <span className="mx-1.5">/</span> <span className="text-ink">
          Order #{order.order_number}
        </span>
      </nav>

      <div className="max-w-md mx-auto">
        <div className="rounded-[26px] border border-ink/8 bg-white p-6 shadow-soft mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-3xl font-extrabold mb-2">
                Order #{order.order_number}
              </h1>
              <p className="text-ink/60 font-semibold">
                {order.name || ""}
              </p>
              {order.email && (
                <p className="text-ink/60 small">
                  {order.email}
                </p>
              )}
            </div>
            <span className={`px-3 py-1 rounded text-xs font-bold ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Order Timeline */}
        <div className="space-y-2 mb-6">
          {[

            { status: "pending", label: "Pending", done: order.status !== "pending" }, //
            { status: "paid", label: "Paid", done: order.status === "paid" || order.status !== "pending" },
            { status: "packed", label: "Packed", done: order.status === "packed" },
            { status: "shipped", label: "Shipped", done: order.status === "shipped" },
            { status: "delivered", label: "Delivered", done: order.status === "delivered" },

          ].map((step, i) => {
            const isCurrent = order.status === step.status;
            const isDone = step.done;
            const passed = isDone || i < (["pending", "paid", "packed", "shipped"].indexOf(order.status) + 1 || 0);

            return (
              <div
                key={step.status}
                className={`flex items-center gap-3 ${
                  passed
                    ? "text-ink/80"
                    : `font-bold text-iris transition-colors`}
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    passed
                      ? "bg-iris"
                      : "bg-ink/20 border-2 border-ink"}
                }`
                />
                <span className="text-[12px] font-bold {passed ? "text-ink" : "text-ink/60"}">
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Itemized Order */}
        {order.items && order.items.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-extrabold mb-4">Items</h2>
            <div className="divide-y divide-ink/8">
              {order.items.map((item) => {
                const [c1, c2] = (item.gradient || "").split(",");
                return (
                  <div
                    key={item.id}
                    className="flex gap-3 py-3 border-b border-ink/5 last:border-0"
                  >
                    <div
                      className="h-12 w-12 rounded-[16px] overflow-hidden bg-ink/10"
                      style={{ background: `linear-gradient(135deg, ${c1}, ${c2 || "#000"})` }}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink truncate">{item.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">Gift</p>
                    </div>
                    <div className="font-display text-lg font-extrabold tabular">
                      {money(item.price_cents)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Summary */}
        {order.subtotal_cents && (
          <div className="mt-6 p-4 rounded-[26px] border border-ink/8 bg-white shadow-soft">
            <div className="flex justify-between text-sm text-ink/60">
              <span>Subtotal</span>
              <span>{money(order.subtotal_cents)}</span>
            </div>
            {order.discount_cents && order.discount_cents > 0 && (
              <div className="flex justify-between text-iris text-sm">
                <span>Discount</span>
                <span>-{money(order.discount_cents)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-ink">
              <span>Total</span>
              <span>{money(order.total_cents)}</span>
            </div>
          </div>
        )}

        <div className="mt-8">
          <Link
            href={`/track/${order.orderNumber}?email=${order.email || ""}`}
            className="btn-outline w-full px-6 py-3 text-center"
          >
            Track another order
          </Link>
        </div>
      </div>
    </main>
  );
}