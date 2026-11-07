import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = createServiceClient();
  const id = params.id;

  const { data: order, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error || !order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id);

  return NextResponse.json({
    order: {
      id: order.id, orderNumber: order.order_number, status: order.status,
      customer: { name: order.name, email: order.email, phone: order.phone,
        address: [order.address1, order.address2, order.city, order.state, order.postal_code, order.country].filter(Boolean).join(", ") },
      pricing: { subtotalCents: order.subtotal_cents, discountCents: order.discount_cents,
        shippingCents: order.shipping_cents, taxCents: order.tax_cents, totalCents: order.total_cents, currency: order.currency, promoCode: order.promo_code },
      payment: { method: order.payment_method, status: order.payment_status, ref: order.payment_ref, brand: order.payment_brand, last4: order.payment_last4 },
      fulfillment: { carrier: order.carrier, trackingNumber: order.tracking_number, deliveryMethod: order.delivery_method, note: order.note },
      source: order.source, placedAt: new Date(order.placed_at).getTime()
    },
    items: items?.map(i => ({
      id: i.id, name: i.name, slug: i.slug, emoji: i.emoji, gradient: i.gradient,
      unitPriceCents: i.unit_price_cents, qty: i.qty, lineTotalCents: i.line_total_cents
    })) ?? [],
    customerTimeline: [],
    customerView: []
  });
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = createServiceClient();
  const body = await req.json();
  const id = params.id;

  const { data: order } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = { status: body.status, updated_at: new Date().toISOString() };
  if (body.status === "shipped") {
    if (body.carrier != null) updates.carrier = body.carrier;
    if (body.tracking != null) updates.tracking_number = body.tracking;
    updates.shipped_at = new Date().toISOString();
  }
  if (body.note) updates.note = body.note;

  await supabase.from("orders").update(updates as never).eq("id", id);
  return NextResponse.json({ ok: true });
}