import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "25");

  let query = supabase.from("profiles").select("id, email, created_at", { count: "exact" });
  if (q) query = query.or(`email.ilike.%${q}%`);

  const { data, count } = await query.order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  return NextResponse.json({
    items: data?.map(p => ({
      id: p.id, email: p.email, name: "", city: "",
      createdAt: new Date(p.created_at).getTime(), orders: 0, ltvCents: 0, lastOrderAt: null
    })) ?? [],
    total: count ?? 0, page, limit,
    pages: Math.max(1, Math.ceil((count ?? 0) / limit)),
    totals: { customers: count ?? 0, revenue: 0 }
  });
}