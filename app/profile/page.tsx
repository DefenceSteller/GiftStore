import Link from "next/link";
import { redirect } from "next/navigation";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import SignOutButton from "@/components/SignOutButton";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My profile — Confetti Club",
  description: "View your account details and order history.",
};

/** Badge styling per order status — matches the track-order page exactly. */
const STATUS_CLASS: Record<string, string> = {
  pending: "bg-ink/10 text-ink/70",
  paid: "bg-acid text-ink",
  packed: "bg-iris text-ink",
  shipped: "border-iris text-iris",
  delivered: "bg-green-100 text-green-900",
  cancelled: "bg-red-100 text-red-900",
  refunded: "bg-purple-100 text-purple-900",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string, email: string): string {
  const src = (name || email || "?").trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return src.slice(0, 2).toUpperCase();
}

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/signin?next=/profile");

  const service = createServiceClient();

  const [profileRes, customerRes, ordersRes] = await Promise.all([
    service
      .from("profiles")
      .select("id, email, role, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    service
      .from("customers")
      .select("name, email, phone, city, created_at")
      .eq("profiles_id", user.id)
      .maybeSingle(),
    service
      .from("orders")
      .select(
        "order_number, status, total_cents, item_count, placed_at, payment_method"
      )
      .eq("customer_id", user.id)
      .order("placed_at", { ascending: false }),
  ]);

  const profile = profileRes.data;
  const customer = customerRes.data;
  const orders = ordersRes.data ?? [];

  const displayName =
    customer?.name?.trim() || user.email.split("@")[0] || user.email;
  const email = profile?.email || customer?.email || user.email;
  const role = profile?.role === "admin" ? "admin" : "customer";
  const memberSince = profile?.created_at || customer?.created_at || null;

  const totalOrders = orders.length;
  const totalSpent = orders
    .filter((o) => o.status !== "cancelled" && o.status !== "refunded")
    .reduce((sum, o) => sum + o.total_cents, 0);
  const itemsGifted = orders.reduce((sum, o) => sum + o.item_count, 0);
  const deliveredCount = orders.filter(
    (o) => o.status === "delivered"
  ).length;

  const detailRows: { label: string; value: string }[] = [
    { label: "Full name", value: displayName },
    { label: "Email", value: email },
    { label: "Phone", value: customer?.phone || "—" },
    { label: "City", value: customer?.city || "—" },
    { label: "Role", value: role === "admin" ? "Administrator" : "Customer" },
    { label: "Member since", value: formatDate(memberSince) },
    { label: "Account ID", value: user.id },
  ];

  const stats = [
    { label: "Total orders", value: String(totalOrders), sub: "placed to date" },
    {
      label: "Total spent",
      value: money(totalSpent),
      sub: "excl. cancelled",
    },
    { label: "Items gifted", value: String(itemsGifted), sub: "across all orders" },
    { label: "Delivered", value: String(deliveredCount), sub: "orders completed" },
  ];

  return (
    <>
      <StoreHeader />
      <main className="container-cc pb-20 pt-8 sm:pt-10">
        <nav
          className="text-xs font-bold text-ink/45"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="transition hover:text-ink">
            Home
          </Link>{" "}
          <span className="mx-1.5">/</span>{" "}
          <span className="text-ink">My profile</span>
        </nav>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
              My profile
            </h1>
            <p className="mt-2 text-sm font-bold text-ink/50">
              Your account details and order history, all in one place.
            </p>
          </div>
        </div>

        {/* Identity hero */}
        <div className="mt-6 rounded-[26px] border border-ink/8 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-to-r from-iris to-acid font-display text-3xl font-extrabold text-white shadow-sticker">
                {initials(displayName, email)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-display text-2xl font-extrabold">
                    {displayName}
                  </h2>
                  <span
                    className={`status-pill ${
                      role === "admin" ? "bg-acid text-ink" : "bg-iris/10 text-iris"
                    }`}
                  >
                    {role === "admin" ? "Admin" : "Customer"}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-bold text-ink/60">
                  {email}
                </p>
                <p className="mt-1 text-xs font-semibold text-ink/45">
                  Member since {formatDate(memberSince)}
                </p>
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-[26px] border border-ink/8 bg-white p-5 shadow-soft"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">
                {s.label}
              </p>
              <p className="mt-2 font-display text-3xl font-extrabold tabular">
                {s.value}
              </p>
              <p className="mt-1 text-xs font-bold text-ink/45">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Order history + account details */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-extrabold">
                Order history
              </h3>
              <span className="text-xs font-bold text-ink/45">
                {totalOrders} order{totalOrders === 1 ? "" : "s"}
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="mt-4 rounded-[26px] border border-dashed border-ink/15 bg-white p-10 text-center">
                <span className="text-5xl">🎁</span>
                <h4 className="mt-4 font-display text-2xl font-extrabold">
                  No orders yet
                </h4>
                <p className="mt-2 text-sm font-bold text-ink/50">
                  When you place an order it will show up here.
                </p>
                <Link
                  href="/shop"
                  className="btn-primary mt-5 inline-block px-6 py-3"
                >
                  Start shopping
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {orders.map((o) => (
                  <div
                    key={o.order_number}
                    className="group block rounded-[26px] border border-ink/8 bg-white p-5 shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">
                          Order
                        </p>
                        <h4 className="truncate font-display text-lg font-extrabold">
                          #{o.order_number}
                        </h4>
                        <p className="mt-1 text-sm font-bold text-ink/50">
                          {o.item_count} item{o.item_count === 1 ? "" : "s"} ·{" "}
                          {formatDate(o.placed_at)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded px-3 py-1 text-xs font-bold ${
                          STATUS_CLASS[o.status] || "text-ink"
                        }`}
                      >
                        {STATUS_LABEL[o.status] || "Unknown"}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-ink/8 pt-3 text-sm font-bold">
                      <span className="text-ink/60">
                        {o.payment_method === "cod"
                          ? "Cash on delivery"
                          : "Card payment"}
                      </span>
                      <span className="font-display text-lg font-extrabold tabular">
                        {money(o.total_cents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[26px] border border-ink/8 bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-extrabold">
                  Account details
                </h3>
                <span
                  className={`status-pill ${
                    role === "admin" ? "bg-acid text-ink" : "bg-iris/10 text-iris"
                  }`}
                >
                  {role === "admin" ? "Admin" : "Customer"}
                </span>
              </div>

              <div className="mt-4 space-y-3 text-sm font-bold">
                {detailRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="shrink-0 text-ink/60">{row.label}</span>
                    <span className="min-w-0 truncate text-right">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[26px] border border-ink/8 bg-white p-5 shadow-soft">
              <h3 className="font-display text-lg font-extrabold">
                Quick links
              </h3>
              <div className="mt-3 grid gap-2 text-sm font-bold">
                <Link
                  href="/shop"
                  className="rounded-xl px-3 py-2.5 transition hover:bg-ink/5 hover:text-iris"
                >
                  🛍️ Continue shopping
                </Link>
                <Link
                  href="/cart"
                  className="rounded-xl px-3 py-2.5 transition hover:bg-ink/5 hover:text-iris"
                >
                  👜 View your bag
                </Link>
                <Link
                  href="/"
                  className="rounded-xl px-3 py-2.5 transition hover:bg-ink/5 hover:text-iris"
                >
                  🏠 Back to home
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <StoreFooter />
    </>
  );
}
