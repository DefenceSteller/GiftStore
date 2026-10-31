'use client'
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default function AdminActivityLogPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  useEffect(() => {;
    ;(async () => {;
      const { data } = await getSessionUser();
      setUser(data);
    })();
  }, []);;

  if (!user) redirect("/auth/signin");
  if (user.role !== "admin") redirect("/");

  const supabase = createClient();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [filterKind, setFilterKind] = useState("all");
  const [search, setSearch] = useState("");

  const [events, setEvents] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const kindOptions = [
    "all",
    "order.created",
    "order.status",
    "product.created",
    "setting.updated",
    "promo.used",
  ];

  // Fetch activity log
  useEffect(() => {
    fetchActivityLog();
  }, [page, filterKind, search]);

  async function fetchActivityLog() {
    let query = supabase
      .from("audit_log")
      .select("*, profiles!actor(id, name)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filterKind !== "all") {
      query = query.eq("kind", filterKind);
    }

    if (search) {
      query = query.or(`kind.ilike.%${search}%,message.ilike.%${search}%,actor.name.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(
      (page - 1) * pageSize,
      page * pageSize - 1
    );

    if (error) console.error("Error fetching activity log:", error);
    setEvents(data || []);
    setTotalCount(count ?? 0);
  }

  // Export to CSV
  const exportCSV = () => {
    const headers = "Kind,Message,Actor,Created At\n";
    const rows = events
      .map(
        (e: any) =>
          `"${e.kind}","${e.message || ""}","${e.actor?.name || ""}","${new Date(
            e.created_at
          ).toISOString()}"`
      )
      .join("\n");
    const csv = headers + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "activity_log.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Initial fetch
  ;(async () => {
    await fetchActivityLog();
  })();

  return (
    <main className="container-cc pb-20 pt-8">
      <nav className="text-xs font-bold text-ink/45" aria-label="Breadcrumb">
        <Link href="/admin" className="transition hover:text-ink">Admin</Link>{" "}
        <span className="mx-1.5">/</span> <span className="text-ink">Activity Log</span>
      </nav>

      <div className="mt-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <div className="rounded-[26x] border border-ink/8 bg-white p-3 shadow-soft">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events… (kind, message, actor)"
                className="input w-full bg-transparent outline-none"
                autoComplete="off"
              />
            </div>
          </div>
          <div>
            <select
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value)}
              className="select select-bordered w-full"
            >
              {kindOptions.map((kind) => (
                <option key={kind} value={kind}>
                  {kind === "all"
                    ? "All Kinds"
                    : kind.replace(".", " → ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-white rounded-[26x] overflow-hidden shadow-soft">
          {events.length === 0 && totalCount === 0 ? (
            <p className="text-ink/60 pt-8 text-center">No events found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold text-ink/60 border-b border-ink/8">
                    <th>Kind</th>
                    <th style={{ width: "40%" }}>Message</th>
                    <th style={{ width: "20%" }}>Actor</th>
                    <th style={{ width: "15%" }}>Created At</th>
                    <th style={{ width: "20%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => {
                    const kindLabel = e.kind.replace(".", " → ");
                    const kindClass = {
                      "order.created": "bg-acid text-ink",
                      "order.status": "bg-iris text-ink",
                      "product.created": "bg-aqua text-ink",
                      "setting.updated": "bg-butter text-ink",
                      "promo.used": "bg-iris text-ink",
                    }[e.kind] || "text-ink/60";

                    const createdAt = e.created_at
                      ? new Date(e.created_at).toLocaleString()
                      : "—";

                    return (
                      <tr key={e.id} className="border-b border-ink/5">
                        <td className={`font-bold text-${kindClass.split(" ")[1] || "ink/60"}`}>
                          {kindLabel}
                        </td>
                        <td>{e.message || "—"}</td>
                        <td>{e.actor?.name || "—"}</td>
                        <td>{createdAt}</td>
                        <td className="flex gap-1">
                          <span className="text-[10px] text-ink/40">—</span>
                        </td>
                      </tr>
                    );
                  })}

                  {events.length < totalCount && (
                    <tfoot>
                      <tr>
                        <td colSpan={5}>
                          <div className="flex justify-between">
                            <span className="text-ink/60">
                              Showing {((page - 1) * pageSize) + 1}-{Math.min(
                                page * pageSize,
                                totalCount
                              )} of {totalCount}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Export button */}
        {totalCount > 0 && (
          <div className="mt-4">
            <button
              onClick={exportCSV}
              className="btn-outline flex items-center gap-2"
            >
              <span className="text-[10px]">Export CSV</span>
            </button>
          </div>
        )}
      </div>
    </main>
  );
}