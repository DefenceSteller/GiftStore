'use client'
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";
import { z } from "zod";

export const dynamic = "force-dynamic";

export default function AdminPromosPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    ;(async () => {
      const { data } = await getSessionUser();
      setUser(data);
    })();
  }, []);

  if (!user) redirect("/auth/signin");
  if (user.role !== "admin") redirect("/");

  const supabase = createClient();
  const [promos, setPromos] = useState<any[]>([]);
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch promos
  useEffect(() => {
    fetchPromos();
  }, []);

  async function fetchPromos() {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching promos:", error);
    setPromos(data || []);
  }

  // Schema for promo form validation
  const promoSchema = z.object({
    code: z.string().min(1, "Code required").max(20).toUpperCase(),
    type: z.enum(["percent", "fixed", "free_shipping"]),
    value: z.number().int().min(1, "Value must be at least 1"),
    min_subtotal_cents: z
      .number()
      .int()
      .min(0, "Min subtotal must be 0 or positive")
      .optional(),
    active: z.boolean(),
  });

  // Save promo (create or update)
  const savePromo = async (promoData: any) => {
    try {
      promoSchema.parse(promoData);
      setFormErrors({});

      const { error } = await supabase
        .from("promo_codes")
        .upsert(
          {
            code: promoData.code,
            type: promoData.type,
            value: promoData.value,
            min_subtotal_cents: promoData.min_subtotal_cents,
            active: promoData.active,
            description: promoData.description,
          },
          { onConflict: ["code"] }
        );

      if (error) throw error;
      setModalOpen(false);
      setEditingPromo(null);
      fetchPromos();
    } catch (err: any) {
      setFormErrors(err.errors || { generic: err.message });
    }
  };

  // Delete promo (soft delete)
  const deletePromo = async (promoId: string) => {
    const { error } = await supabase
      .from("promo_codes")
      .update({ active: false })
      .eq("id", promoId);

    if (error) console.error("Error deleting promo:", error);
    fetchPromos();
  };

  // Initial fetch
  ;(async () => {
    await fetchPromos();
  })();

  // ... rest of the component (same as before)
  // I'll keep the rest similar to what was there
  return (
    <main className="container-cc pb-20 pt-8">
      <nav className="text-xs font-bold text-ink/45" aria-label="Breadcrumb">
        <Link href="/admin" className="transition hover:text-ink">Admin</Link>{" "}
        <span className="mx-1.5">/</span> <span className="text-ink">Promos</span>
      </nav>

      <div className="mt-6">
        {/* Table */}
        <div className="bg-white rounded-[26x] overflow-hidden shadow-soft">
          {promos.length === 0 ? (
            <p className="text-ink/60 pt-8 text-center">No promos found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold text-ink/60 border-b border-ink/8">
                    <th>Code</th>
                    <th style={{ width: "15%" }}>Type</th>
                    <th style={{ width: "12%" }}>Value</th>
                    <th style={{ width: "15%" }}>Min Subtotal</th>
                    <th style={{ width: "12%" }}>Uses</th>
                    <th style={{ width: "15%" }}>Active</th>
                    <th style={{ width: "15%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {promos.map((p) => {
                    const typeLabel = {
                      percent: "Percent",
                      fixed: "Fixed",
                      free_shipping: "Free Shipping",
                    }[p.type] || p.type;

                    const statusClass = p.active
                      ? "bg-green-100 text-green-900"
                      : "bg-gray-300 text-gray-500";

                    return (
                      <tr key={p.id} className="border-b border-ink/5">
                        <td className="font-bold text-ink">{p.code}</td>
                        <td>{typeLabel}</td>
                        <td>{money(p.value)}</td>
                        <td>{money(p.min_subtotal_cents)}</td>
                        <td>{p.uses ?? 0}</td>
                        <td>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${statusClass}`}>
                            {p.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="flex gap-1">
                          <button
                            onClick={() =>
                              setEditingPromo({ ...p, id: p.id })
                            }
                            className="btn-outline btn-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deletePromo(p.id)}
                            className="btn-xs text-red-600"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal for Create/Edit */}
        {modalOpen || editingPromo && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur z-50 flex items-center justify-center"
          >
            <div
              className="bg-white rounded-[26x] p-6 max-w-md w-full shadow-soft"
              style={{ maxWidth: "90%" }}
            >
              <h2 className="font-display text-2xl font-extrabold mb-4">
                {editingPromo ? "Edit Promo" : "Create Promo"}
              </h2>

              <form
                onSubmit={
                  // eslint-disable-next-line react/jsx-no-bind
                  (e: React.FormEvent) => {
                    e.preventDefault();
                    const formData = new FormData(
                      e.target as HTMLFormElement
                    );
                    const promoData = {
                      code: formData.get("code") as string,
                      type: formData.get("type") as "percent" | "fixed" | "free_shipping",
                      value: parseInt(formData.get("value") as string),
                      min_subtotal_cents:
                        formData.get("min_subtotal_cents") !== ""
                          ? parseInt(formData.get("min_subtotal_cents") as string)
                          : undefined,
                      active: formData.get("active") === "on",
                      description: formData.get("description") as string,
                    };
                    savePromo(promoData);
                  }
                }
                className="space-y-4"
              >
                <input
                  type="hidden"
                  name="id"
                  value={editingPromo?.id || ""}
                />
                <input
                  type="text"
                  name="code"
                  placeholder="Code *"
                  value={editingPromo?.code || ""}
                  required
                  className="input"
                />
                <select
                  name="type"
                  className="input"
                  disabled={!!editingPromo}
                >
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed</option>
                  <option value="free_shipping">Free Shipping</option>
                </select>
                <input
                  type="number"
                  name="value"
                  placeholder="Value (cents) *"
                  min={1}
                  value={editingPromo?.value || ""}
                  required
                  className="input"
                />
                <input
                  type="number"
                  name="min_subtotal_cents"
                  placeholder="Min Subtotal (cents)"
                  min={0}
                  value={editingPromo?.min_subtotal_cents ?? ""}
                  className="input"
                />
                <div>
                  <label>
                    <input
                      type="checkbox"
                      name="active"
                      checked={editingPromo?.active !== false}
                      className="rounded border"
                    />
                    Active
                  </label>
                </div>
                <input
                  type="text"
                  name="description"
                  placeholder="Description (optional)"
                  value={editingPromo?.description || ""}
                  className="input"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 px-4 py-2 bg-gradient-to-r from-iris to-acid text-white rounded-[26x]">
                    {editingPromo ? "Update Promo" : "Create Promo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-ink/50 rounded-[26x] text-ink"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingPromo && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur z-50"
            style={{ display: "block" }}
          >
            {/* Background overlay */}
          </div>
        )}
      </div>
    </main>
  );
}