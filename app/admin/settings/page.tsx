'use client'
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import SignOutButton from "@/components/SignOutButton";
import { money } from "@/lib/format";

export default function AdminSettingsPage() {
  const supabase = createClient();

  // Settings state
  const [settings, setSettings] = useState({
    store_name: "Confetti Club",
    currency: "USD" as "USD" | "PKR",
    free_shipping_threshold_cents: 5000,
    standard_shipping_cents: 599,
    express_shipping_cents: 1299,
    tax_rate_bps: 500,
    delivery_days_standard: "5-7",
    delivery_days_express: "2-3",
    announcement_banner: "FREE SHIPPING OVER Rs 50...",
  });

  // Fetch settings from Supabase after component mounts
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from("settings").select("key, value");
      if (data) {
        const parsed: Record<string, any> = {};
        data.forEach((d: any) => {
          parsed[d.key] = d.value;
        });
        setSettings({
          store_name: parsed.store_name ?? "Confetti Club",
          currency: parsed.currency ?? "USD",
          free_shipping_threshold_cents: parsed.free_shipping_threshold_cents
            ? parseInt(parsed.free_shipping_threshold_cents)
            : 5000,
          standard_shipping_cents: parsed.standard_shipping_cents
            ? parseInt(parsed.standard_shipping_cents)
            : 599,
          express_shipping_cents: parsed.express_shipping_cents
            ? parseInt(parsed.express_shipping_cents)
            : 1299,
          tax_rate_bps: parsed.tax_rate_bps ?? 500,
          delivery_days_standard: parsed.delivery_days_standard ?? "5-7",
          delivery_days_express: parsed.delivery_days_express ?? "2-3",
          announcement_banner: parsed.announcement_banner ?? "",
        });
      }
    })();
  }, [supabase]);

  // Save settings to Supabase
  const saveSettings = async (newSettings: typeof settings) => {
    const upserts = Object.entries(newSettings).map(([key, value]) =>
      supabase.from("settings").upsert({
        key,
        value: String(value),
        updated_at: new Date().toISOString(),
      })
    );
    const results = await Promise.all(upserts);
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error("Error saving settings:", errors);
    }
    setSettings(newSettings);
  };

  // Handle form save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
  };

  return (
    <main className="container-cc pb-20 pt-8">
      <nav className="text-xs font-bold text-ink/45" aria-label="Breadcrumb">
        <Link href="/admin" className="transition hover:text-ink">Admin</Link>{" "}
        <span className="mx-1.5">/</span> <span className="text-ink">Settings</span>
      </nav>

      <div className="mt-6">
        <form
          className="bg-white rounded-[26px] p-6 shadow-soft space-y-6"
          onSubmit={handleSave}
        >
          <h2 className="font-display text-2xl font-extrabold mb-4">
            Store Settings
          </h2>

          <div>
            <label className="block text-[12px] font-bold text-ink/60 mb-2">
              Store Name
            </label>
            <input
              value={settings.store_name}
              onChange={(e) =>
                setSettings({ ...settings, store_name: e.target.value.trim() })
              }
              placeholder="Confetti Club"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-ink/60 mb-2">
              Announcement Banner
            </label>
            <textarea
              value={settings.announcement_banner}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  announcement_banner: e.target.value.trim(),
                })
              }
              rows={3}
              placeholder="FREE SHIPPING OVER Rs 50..."
              className="input w-full h-24"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-ink/60 mb-2">
              Currency
            </label>
            <select
              value={settings.currency}
              onChange={(e) =>
                setSettings({ ...settings, currency: e.target.value as "USD" | "PKR" })
              }
              className="input"
            >
              <option value="USD">USD</option>
              <option value="PKR">PKR</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-ink/60 mb-2">
                Free Shipping Threshold (cents)
              </label>
              <input
                value={settings.free_shipping_threshold_cents}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    free_shipping_threshold_cents: parseInt(e.target.value),
                  })
                }
                type="number"
                min={0}
                className="input"
              />
              <p className="text-[10px] text-ink/55">Rs {money(
                settings.free_shipping_threshold_cents
              )} minimum</p>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-ink/60 mb-2">
                Standard Shipping (cents)
              </label>
              <input
                value={settings.standard_shipping_cents}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    standard_shipping_cents: parseInt(e.target.value),
                  })
                }
                type="number"
                min={0}
                className="input"
              />
              <p className="text-[10px] text-ink/55">Rs {money(
                settings.standard_shipping_cents
              )}</p>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-ink/60 mb-2">
                Express Shipping (cents)
              </label>
              <input
                value={settings.express_shipping_cents}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    express_shipping_cents: parseInt(e.target.value),
                  })
                }
                type="number"
                min={0}
                className="input"
              />
              <p className="text-[10px] text-ink/55">Rs {money(
                settings.express_shipping_cents
              )}</p>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-ink/60 mb-2">
                Tax Rate (bps)
              </label>
              <input
                value={settings.tax_rate_bps}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    tax_rate_bps: parseInt(e.target.value),
                  })
                }
                type="number"
                min={0}
                className="input"
              />
              <p className="text-[10px] text-ink/55">e.g., 500 = 5%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-ink/60 mb-2">
                Standard Delivery Days
              </label>
              <input
                value={settings.delivery_days_standard}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    delivery_days_standard: e.target.value,
                  })
                }
                className="input"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-ink/60 mb-2">
                Express Delivery Days
              </label>
              <input
                value={settings.delivery_days_express}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    delivery_days_express: e.target.value,
                  })
                }
                className="input"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              className="w-full px-6 py-3 font-display font-extrabold text-white bg-gradient-to-r from-iris to-acid rounded-[26px] transition"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}