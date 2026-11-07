import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { type, path, visitorId, source, referrer } = body;

  if (!type || !path || !source) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validTypes = ["pageview", "product_view", "add_to_cart", "checkout_start", "purchase"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const cid = visitorId || randomUUID();

  const { error } = await supabase.from("traffic_events").insert({
    type,
    path,
    source,
    referrer: referrer || null,
    visitor_id: cid,
    revenue_cents: body.revenueCents ?? 0,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Traffic track error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, visitorId: cid });
}
