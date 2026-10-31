import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STORE_CONFIG } from "@/lib/store-config";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Phone too short").max(15, "Phone too long"),
});

const shippingSchema = z.object({
  address1: z.string().min(1, "Address required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City required"),
  state: z.string().min(1, "State required"),
  postal_code: z.string().regex(/^[0-9]{6}$/, "Postal code must be 6 digits"),
  country: z.string().min(1, "Country required"),
});

const deliverySchema = z.object({
  delivery: z.enum(["standard", "express"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate contact
    const contactResult = contactSchema.safeParse({
      name: String(body?.name ?? "").trim(),
      email: String(body?.email ?? "").trim(),
      phone: String(body?.phone ?? "").trim(),
    });

    if (!contactResult.success) {
      return new Response(
        JSON.stringify({ error: contactResult.error.errors[0].message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate shipping
    const shippingResult = shippingSchema.safeParse({
      address1: String(body?.address1 ?? "").trim(),
      address2: String(body?.address2 ?? "").trim(),
      city: String(body?.city ?? "").trim(),
      state: String(body?.state ?? "").trim(),
      postal_code: String(body?.postal_code ?? "").trim(),
      country: String(body?.country ?? "").trim(),
    });

    if (!shippingResult.success) {
      return new Response(
        JSON.stringify({ error: shippingResult.error.errors[0].message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate delivery
    const deliveryResult = deliverySchema.safeParse({
      delivery: String(body?.delivery ?? "standard"),
    });

    if (!deliveryResult.success) {
      return new Response(
        JSON.stringify({ error: deliveryResult.error.errors[0].message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = await createClient();

    // Calculate pricing - in a real app, compute from cart items
    // For now use config defaults
    const subtotal = 0; // Will be calculated from actual cart
    const afterDiscount = subtotal;
    const freeShip = false;
    const shipping =
      freeShip || afterDiscount >= STORE_CONFIG.free_shipping_threshold_cents
        ? 0
        : STORE_CONFIG.standard_shipping_cents;
    const tax = Math.round((afterDiscount * STORE_CONFIG.tax_rate_bps) / 10000);
    const total = afterDiscount + shipping + tax;

    // Create order number
    const orderNumber = "CC-" + Math.random().toString(36).substring(2, 9).toUpperCase();

    // Insert order into database
    const { error: orderError } = await supabase.from("orders").insert({
      order_number: orderNumber,
      customer_id: null, // anon; will be filled if user signed in
      email: contactResult.data.email,
      name: contactResult.data.name,
      phone: contactResult.data.phone,
      address1: shippingResult.data.address1,
      address2: shippingResult.data.address2,
      city: shippingResult.data.city,
      state: shippingResult.data.state,
      postal_code: shippingResult.data.postal_code,
      country: shippingResult.data.country,
      subtotal_cents: Math.round(subtotal * 100),
      discount_cents: 0,
      shipping_cents: shipping,
      tax_cents: tax,
      total_cents: total,
      currency: "USD",
      status: "pending",
      payment_method: "cod",
      payment_status: "pending",
      item_count: 0,
      source: "nextjs-checkout",
    });

    if (orderError) {
      return new Response(
        JSON.stringify({ error: "Failed to create order. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, orderNumber }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}