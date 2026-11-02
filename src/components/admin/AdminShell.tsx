"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "📊 Overview" },
  { href: "/admin/orders", label: "📦 Orders" },
  { href: "/admin/products", label: "🎁 Products" },
  { href: "/admin/customers", label: "👥 Customers" },
  { href: "/admin/analytics", label: "📈 Analytics" },
  { href: "/admin/settings", label: "⚙️ Settings" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("Store Owner");

  useEffect(() => {
    fetch("/api/admin/me").then(r => r.json()).then(d => {
      if (d.admin?.email) setAdminEmail(d.admin.email);
    }).catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/auth/signin";
  }

  const initials = adminEmail.split("@")[0].slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <div
        className={`fixed inset-0 z-40 bg-ink/50 transition-opacity lg:hidden ${sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[252px] -translate-x-full flex-col bg-ink text-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : ""}`}>
        <div className="flex items-center gap-3 px-5 py-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-white/15 bg-acid text-base text-ink">🎁</span>
            <span>
              <span className="block font-display text-base font-extrabold leading-none">Confetti<span className="text-acid">Club</span></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Admin</span>
            </span>
          </Link>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3 text-sm font-extrabold" id="admin-nav">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                  active ? "bg-white/[0.07] text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="w-5 text-center">{item.label.split(" ")[0]}</span>
                {item.label.split(" ").slice(1).join(" ")}
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mb-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Live traffic</span>
            <span className="h-2 w-2 animate-pulse rounded-full bg-acid" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold tabular" id="side-visitors">0</p>
          <p className="text-[11px] font-bold text-white/45">active visitors now</p>
        </div>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <span id="admin-avatar" className="grid h-9 w-9 place-items-center rounded-full bg-iris text-xs font-black">{initials}</span>
            <div className="min-w-0 flex-1">
              <p id="admin-name" className="truncate text-[13px] font-extrabold">Store Owner</p>
              <p id="admin-email" className="truncate text-[11px] font-bold text-white/40">{adminEmail}</p>
            </div>
            <button onClick={handleLogout} title="Sign out" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-white/60 transition hover:border-coral hover:text-coral">⏻</button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-ink/8 bg-mist/85 backdrop-blur-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-7">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border-2 border-ink/10 bg-white lg:hidden">☰</button>
              <div>
                <h1 id="page-title" className="font-display text-xl font-extrabold leading-none sm:text-2xl">Overview</h1>
                <p id="page-sub" className="mt-1 text-xs font-bold text-ink/45">Live store performance</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href="/" target="_blank" rel="noopener" className="btn-primary btn-sm">View store ↗</a>
            </div>
          </div>
        </header>

        <main className="space-y-4 px-4 py-6 sm:px-7">
          {children}
        </main>
      </div>
    </div>
  );
}