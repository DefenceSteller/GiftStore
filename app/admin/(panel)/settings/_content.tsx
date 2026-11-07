"use client";

import { useState, useEffect } from "react";
import { money } from "@/lib/format";

export default function SettingsContent() {
  const [settings, setSettings] = useState({
    store_name: "Confetti Club",
    currency: "USD",
    announcement: "FREE SHIPPING OVER Rs 50  ✦  NEW DROPS EVERY FRIDAY  ✦  30-DAY EASY RETURNS",
    support_email: "hello@confetticlub.shop",
    free_shipping_threshold_cents: 5000,
    standard_shipping_cents: 599,
    express_shipping_cents: 1299,
    tax_rate_bps: 500,
    delivery_days_standard: "5-7",
    delivery_days_express: "2-3"
  });
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    if (data.settings) {
      setSettings({ ...settings, ...data.settings });
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Map local state keys to their corresponding DB setting keys
    const payload: Record<string, string | number> = { ...settings };
    if (payload.announcement !== undefined) {
      payload["announcement_banner"] = payload.announcement;
      delete payload.announcement;
    }
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setSaveMsg("Settings saved!");
    setTimeout(() => setSaveMsg(""), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-lg font-extrabold">Store settings</h2>
          <p className="mt-1 text-xs font-bold text-ink/45">Applies to the storefront immediately.</p>
          <form onSubmit={handleSave} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Store name</span>
              <input
                name="store_name"
                className="input"
                value={settings.store_name}
                onChange={e => setSettings({ ...settings, store_name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="label">Currency</span>
              <input
                name="currency"
                className="input font-mono"
                value={settings.currency}
                onChange={e => setSettings({ ...settings, currency: e.target.value })}
                maxLength={3}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Announcement bar</span>
              <input
                name="announcement"
                className="input"
                value={settings.announcement}
                onChange={e => setSettings({ ...settings, announcement: e.target.value })}
                maxLength={300}
              />
            </label>
            <label className="block">
              <span className="label">Support email</span>
              <input
                name="support_email"
                type="email"
                className="input"
                value={settings.support_email}
                onChange={e => setSettings({ ...settings, support_email: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="label">Tax rate (%)</span>
              <input
                name="tax_rate"
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={(Number(settings.tax_rate_bps) / 100).toFixed(2)}
                onChange={e => setSettings({ ...settings, tax_rate_bps: Math.round(Number(e.target.value) * 100) })}
              />
            </label>
            <label className="block">
              <span className="label">Free shipping over (Rs)</span>
              <input
                name="free_shipping"
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={settings.free_shipping_threshold_cents / 100}
                onChange={e => setSettings({ ...settings, free_shipping_threshold_cents: Math.round(Number(e.target.value) * 100) })}
              />
            </label>
            <label className="block">
              <span className="label">Standard shipping (Rs)</span>
              <input
                name="standard_shipping"
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={settings.standard_shipping_cents / 100}
                onChange={e => setSettings({ ...settings, standard_shipping_cents: Math.round(Number(e.target.value) * 100) })}
              />
            </label>
            <label className="block">
              <span className="label">Express shipping (Rs)</span>
              <input
                name="express_shipping"
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={settings.express_shipping_cents / 100}
                onChange={e => setSettings({ ...settings, express_shipping_cents: Math.round(Number(e.target.value) * 100) })}
              />
            </label>
            <label className="block">
              <span className="label">Standard delivery (days)</span>
              <input
                name="delivery_days_standard"
                className="input"
                value={settings.delivery_days_standard}
                onChange={e => setSettings({ ...settings, delivery_days_standard: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="label">Express delivery (days)</span>
              <input
                name="delivery_days_express"
                className="input"
                value={settings.delivery_days_express}
                onChange={e => setSettings({ ...settings, delivery_days_express: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="submit" className="btn-primary btn-sm">
                Save settings {saveMsg && <span className="ml-2 text-acid">{saveMsg}</span>}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-display text-lg font-extrabold">Promo codes</h2>
            <p className="text-xs font-bold text-ink/45">Codes apply instantly at checkout.</p>
            <PromosSection />
          </div>
          <div className="card p-6">
            <h2 className="font-display text-lg font-extrabold">System</h2>
            <dl className="mt-4 grid gap-2.5 text-sm font-bold">
              <div className="flex items-center justify-between gap-3 border-b border-ink/6 pb-2">
                <dt className="text-ink/45">Runtime</dt>
                <dd className="text-right font-extrabold tabular">Next.js 16</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-ink/6 pb-2">
                <dt className="text-ink/45">Database</dt>
                <dd className="text-right font-extrabold tabular">Supabase</dd>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2">
                <dt className="text-ink/45">Environment</dt>
                <dd className="text-right font-extrabold tabular">production</dd>
              </div>
            </dl>
            <a href="/api/admin/export/orders.csv" className="btn-outline btn-sm mt-4 block text-center">⬇ Export orders (CSV)</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromosSection() {
  const [promos, setPromos] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newPromo, setNewPromo] = useState({ code: "", type: "percent", value: "10", minSubtotal: "", description: "" });

  useEffect(() => {
    loadPromos();
  }, []);

  async function loadPromos() {
    const res = await fetch("/api/admin/promos");
    const data = await res.json();
    setPromos(data.items || []);
  }

  async function handleCreate() {
    const payload = {
      code: newPromo.code.toUpperCase(),
      type: newPromo.type,
      value: newPromo.type === "fixed" ? Math.round(Number(newPromo.value) * 100) : Number(newPromo.value),
      minSubtotalCents: newPromo.minSubtotal ? Math.round(Number(newPromo.minSubtotal) * 100) : 0,
      description: newPromo.description,
      active: true
    };
    await fetch("/api/admin/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setShowModal(false);
    setNewPromo({ code: "", type: "percent", value: "10", minSubtotal: "", description: "" });
    loadPromos();
  }

  async function togglePromo(promo: any) {
    await fetch(`/api/admin/promos/${promo.code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !promo.active })
    });
    loadPromos();
  }

  async function deletePromo(promo: any) {
    await fetch(`/api/admin/promos/${promo.code}`, { method: "DELETE" });
    loadPromos();
  }

  return (
    <>
      <div className="mt-5 space-y-2">
        {promos.length === 0 ? (
          <p className="text-sm font-bold text-ink/45">No promo codes yet.</p>
        ) : (
          promos.map((p) => (
            <div key={p.code} className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 px-4 py-3">
              <span className="rounded-xl border-2 border-dashed border-ink/25 bg-mist px-3 py-1.5 font-mono text-sm font-black tracking-wider">
                {p.code}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold">
                  {p.type === "percent" && `${p.value}% off`}
                  {p.type === "fixed" && `${money(p.value)} off`}
                  {p.type === "free_shipping" && "Free shipping"}
                </span>
                <span className="block text-[11px] font-bold text-ink/45">
                  {p.min_subtotal_cents ? `Min ${money(p.min_subtotal_cents)} · ` : ""}
                  {p.uses} uses
                  {p.description && ` · ${p.description}`}
                </span>
              </span>
              <span className={p.active ? "status-pill bg-acid text-ink" : "status-pill bg-ink/10 text-ink/55"}>
                {p.active ? "Active" : "Off"}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => togglePromo(p)}
                  className="rounded-full border-2 border-ink/10 px-3 py-1 text-[11px] font-black hover:border-ink"
                >
                  {p.active ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => deletePromo(p)}
                  className="rounded-full border-2 border-ink/10 px-3 py-1 text-[11px] font-black hover:border-coral hover:text-coral"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <button onClick={() => setShowModal(true)} className="btn-primary btn-sm mt-4">
        ＋ New code
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[28px] border-2 border-ink bg-white p-6 shadow-sticker">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-extrabold">New promo code</h2>
                <p className="text-xs font-bold text-ink/45">Codes apply instantly at checkout.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink/10 hover:border-ink">✕</button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Code *</span>
                <input
                  className="input font-mono uppercase"
                  placeholder="CONFETTI10"
                  value={newPromo.code}
                  onChange={e => setNewPromo({ ...newPromo, code: e.target.value })}
                  maxLength={24}
                  required
                />
              </label>
              <label className="block">
                <span className="label">Type</span>
                <select
                  className="input"
                  value={newPromo.type}
                  onChange={e => setNewPromo({ ...newPromo, type: e.target.value as any })}
                >
                  <option value="percent">Percentage off</option>
                  <option value="fixed">Fixed amount off</option>
                  <option value="free_shipping">Free shipping</option>
                </select>
              </label>
              {newPromo.type !== "free_shipping" && (
                <label className="block">
                  <span className="label">Value</span>
                  <input
                    type="number"
                    className="input"
                    value={newPromo.value}
                    onChange={e => setNewPromo({ ...newPromo, value: e.target.value })}
                  />
                </label>
              )}
              <label className="block">
                <span className="label">Min subtotal (Rs)</span>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={newPromo.minSubtotal}
                  onChange={e => setNewPromo({ ...newPromo, minSubtotal: e.target.value })}
                  placeholder="0.00"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Description</span>
                <input
                  className="input"
                  placeholder="Spring drop"
                  value={newPromo.description}
                  onChange={e => setNewPromo({ ...newPromo, description: e.target.value })}
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-outline btn-sm">Cancel</button>
              <button onClick={handleCreate} className="btn-primary btn-sm">Create code</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}