"use client";

import { useState, useEffect } from "react";
import { money } from "@/lib/format";

const STATUS_TABS = [
  ["all", "All"],
  ["active", "Active"],
  ["low", "Low stock"],
  ["archived", "Archived"]
];

export default function ProductsContent() {
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState(1);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadProducts();
  }, [page, status, search]);

  useEffect(() => {
    fetch("/api/admin/categories").then(r => r.json()).then(d => {
      if (Array.isArray(d.categories)) setCategories(d.categories);
    }).catch(() => {});
  }, []);

  async function loadProducts() {
    const params = new URLSearchParams({
      status,
      q: search,
      page: String(page),
      limit: "25"
    });
    const res = await fetch(`/api/admin/products?${params}`);
    const data = await res.json();
    setProducts(data.items || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setCounts(data.counts || {});
  }

  async function handleSave(product: any) {
    setSaveError(null);
    setSaving(true);
    try {
      // Convert special __new__ category into a plain string
      const payload = { ...product };
      if (payload.category === "__new__" && payload._newCategory) {
        payload.category = payload._newCategory.trim();
      }
      delete (payload as any)._newCategory;

      const isEdit = !!product.id;
      const url = isEdit
        ? `/api/admin/products/${product.id}`
        : "/api/admin/products";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server returned ${res.status}`);
      }
      setShowModal(false);
      await loadProducts();
    } catch (err: any) {
      setSaveError(err.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server returned ${res.status}`);
      await loadProducts();
    } catch (err: any) {
      setSaveError(err.message || "Failed to delete product.");
    }
  }

  return (
    <div className="space-y-4">
      {saveError && (
        <div className="card border-2 border-coral bg-coral/5 p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-extrabold text-coral">Operation failed</p>
              <p className="text-sm font-bold text-coral/80">{saveError}</p>
            </div>
            <button
              onClick={() => setSaveError(null)}
              className="ml-auto text-coral hover:text-coral/70"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setStatus(key); setPage(1); }}
                className={`chip ${status === key ? "chip-active" : ""}`}
              >
                {label}
                <span className="ml-1 text-[11px] font-black">{counts[key] || 0}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search products…"
              className="input !py-2.5 w-full text-sm sm:w-64"
            />
            <button
              onClick={() => { setEditingProduct(null); setShowModal(true); }}
              className="btn-primary btn-sm"
            >
              ＋ New product
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/8 bg-mist/60 text-[11px] font-black uppercase tracking-wider text-ink/45">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/6">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm font-bold text-ink/45">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-mist/60 transition">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        {p.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={p.imageUrl} alt={p.name} className="h-11 w-11 shrink-0 rounded-xl object-cover" width={44} height={44} />
                        ) : (
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg"
                            style={{ background: `linear-gradient(135deg, ${p.gradient?.split(",")[0] || "#7C5CFF"}, ${p.gradient?.split(",")[1] || "#D3FF52"})` }}>
                            {p.emoji || "🎁"}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-extrabold text-ink">{p.name}</span>
                          <span className="block truncate text-[11px] font-bold text-ink/45">{p.tagline || p.slug}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className="status-pill bg-mist text-ink/60">{p.category}</span></td>
                    <td className="px-4 py-3">
                      <span className="block font-black tabular">{money(p.priceCents)}</span>
                      {p.compareAtCents && <span className="block text-[11px] font-bold text-ink/35 line-through">{money(p.compareAtCents)}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-pill ${p.stock <= 0 ? "bg-coral text-white" : p.stock <= 5 ? "bg-butter text-ink" : "bg-acid/40 text-ink"}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-ink/60 tabular">★ {p.rating?.toFixed(1)} ({p.reviewCount})</td>
                    <td className="px-4 py-3">
                      {p.active
                        ? <span className="status-pill bg-aqua text-ink">Active</span>
                        : <span className="status-pill bg-ink/10 text-ink/55">Archived</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditingProduct(p); setShowModal(true); }} className="mr-1 rounded-full border-2 border-ink/10 px-2.5 py-1 text-[11px] font-black hover:border-ink">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="rounded-full border-2 border-ink/10 px-2.5 py-1 text-[11px] font-black hover:border-coral hover:text-coral">Archive</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 px-4 py-3 text-sm font-bold text-ink/55">
          <span>{`Showing ${(page - 1) * 25 + 1}-${Math.min(page * 25, total)} of ${total}`}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-outline btn-sm">← Prev</button>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-outline btn-sm">Next →</button>
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}

function ProductModal({ product, onClose, onSave, saving, categories }: { product: any, onClose: () => void, onSave: (p: any) => Promise<void>, saving: boolean, categories: string[] }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    tagline: product?.tagline || "",
    category: product?.category || (categories[0] || ""),
    priceCents: product?.priceCents || 0,
    compareAtCents: product?.compareAtCents || null,
    stock: product?.stock || 0,
    rating: product?.rating || 4.5,
    emoji: product?.emoji || "🎁",
    gradient: product?.gradient || "#7C5CFF,#D3FF52",
    description: product?.description || "",
    imageUrl: product?.imageUrl || "",
    _newCategory: "",
    is_active: product?.active ?? true,
    is_featured: product?.featured ?? false
  });

  function update(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({ ...product, ...form });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border-2 border-ink bg-white p-6 shadow-sticker">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-extrabold">{product ? "Edit product" : "New product"}</h2>
            <p className="text-xs font-bold text-ink/45">{product ? `Editing ${product.name}` : "It appears in the shop the moment you save."}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink/10 hover:border-ink">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Name *</span>
            <input name="name" className="input" value={form.name} onChange={e => update("name", e.target.value)} required />
          </label>
          <label className="block">
            <span className="label">Category *</span>
            <select
              name="category"
              className="input cursor-pointer"
              value={form.category}
              onChange={e => update("category", e.target.value)}
              required
            >
              {categories.length === 0 && <option value="">— type to create new —</option>}
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__new__">+ Add new category…</option>
            </select>
          </label>
          {form.category === "__new__" && (
            <label className="block sm:col-span-2">
              <span className="label">New Category Name *</span>
              <input
                className="input"
                value={form._newCategory || ""}
                onChange={e => update("_newCategory", e.target.value)}
                placeholder="e.g. New Collection"
                autoFocus
              />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="label">Tagline</span>
            <input name="tagline" className="input" value={form.tagline} onChange={e => update("tagline", e.target.value)} placeholder="One line of charm…" />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Product Image URL</span>
            <input
              name="imageUrl"
              className="input font-mono text-xs"
              value={form.imageUrl}
              onChange={e => update("imageUrl", e.target.value)}
              placeholder="https://i.imgur.com/abc123.jpg  (optional — leaves SVG as fallback)"
            />
          </label>
          <label className="block">
            <span className="label">Price (cents) *</span>
            <input name="priceCents" type="number" step="1" min="1" className="input" value={form.priceCents} onChange={e => update("priceCents", parseInt(e.target.value) || 0)} required />
          </label>
          <label className="block">
            <span className="label">Compare-at price (cents)</span>
            <input name="compareAtCents" type="number" step="1" min="0" className="input" value={form.compareAtCents || ""} onChange={e => update("compareAtCents", e.target.value ? parseInt(e.target.value) : null)} />
          </label>
          <label className="block">
            <span className="label">Stock *</span>
            <input name="stock" type="number" step="1" min="0" className="input" value={form.stock} onChange={e => update("stock", parseInt(e.target.value) || 0)} required />
          </label>
          <label className="block">
            <span className="label">Rating (0-5)</span>
            <input name="rating" type="number" step="0.1" min="0" max="5" className="input" value={form.rating} onChange={e => update("rating", parseFloat(e.target.value) || 0)} />
          </label>
          <label className="block">
            <span className="label">Emoji</span>
            <input name="emoji" className="input" value={form.emoji} onChange={e => update("emoji", e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Gradient (hex colors)</span>
            <input name="gradient" className="input font-mono text-xs" value={form.gradient} onChange={e => update("gradient", e.target.value)} />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Description</span>
            <textarea name="description" rows={4} className="input resize-none" value={form.description} onChange={e => update("description", e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-extrabold">
              <input type="checkbox" checked={form.is_active} onChange={e => update("is_active", e.target.checked)} />
              Active in shop
            </label>
            <label className="flex items-center gap-2 text-sm font-extrabold">
              <input type="checkbox" checked={form.is_featured} onChange={e => update("is_featured", e.target.checked)} />
              Featured
            </label>
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={onClose} disabled={saving} className="btn-outline btn-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary btn-sm">
              {saving ? "Saving…" : (product ? "Save changes" : "Create product")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}