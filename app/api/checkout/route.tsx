import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getServerStoreConfig } from "@/lib/store-config";
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
  postal_code: z.string().min(3, "Postal/ZIP code required").max(12, "Postal code too long"),
  country: z.string().default("PK"),
});

const deliverySchema = z.object({
  delivery: z.enum(["standard", "express"]),
});

const cartItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  priceCents: z.number().int().positive(),
  emoji: z.string(),
  gradient: z.string(),
  image: z.string(),
  stock: z.number().int().nonnegative(),
  maxQty: z.number().int().positive(),
  qty: z.number().int().positive(),
});

const bodySchema = z.object({
  contact: contactSchema,
  shipping: shippingSchema,
  delivery: deliverySchema,
  cartItems: z.array(cartItemSchema),
  promoCode: z.string().optional(),
});

function generateOrderNumber(): string {
  return "CC-" + Math.random().toString(36).substring(2, 9).toUpperCase();
}

async function ensureProfile(supabase: ReturnType<typeof createServiceClient>, email: string, name: string): Promise<string> {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    return existingProfile.id;
  }

  const { data: newProfile, error } = await supabase
    .from("profiles")
    .insert({ email, role: "customer" })
    .select("id")
    .single();

  if (error || !newProfile) {
    throw new Error("Failed to create customer profile");
  }
  return newProfile.id;
}

async function ensureCustomer(
  supabase: ReturnType<typeof createServiceClient>,
  profileId: string,
  email: string,
  name: string,
  phone: string | null,
  city: string | null
): Promise<string> {
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("profiles_id", profileId)
    .maybeSingle();

  if (existingCustomer) {
    await supabase
      .from("customers")
      .update({ name, phone, city })
      .eq("id", existingCustomer.id);
    return existingCustomer.id;
  }

  const { data: newCustomer, error } = await supabase
    .from("customers")
    .insert({ profiles_id: profileId, email, name, phone, city })
    .select("id")
    .single();

  if (error || !newCustomer) {
    throw new Error("Failed to create customer record");
  }
  return newCustomer.id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parseResult = bodySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { contact, shipping, delivery, cartItems, promoCode } = parseResult.data;
    const supabase = createServiceClient();

    // Re-price from DB: fetch product prices by slug
    const slugs = cartItems.map((item) => item.slug);
    const { data: products } = await supabase
      .from("products")
      .select("id, slug, price_cents, stock, name, emoji, gradient")
      .in("slug", slugs)
      .eq("is_active", true);

    if (!products || products.length === 0) {
      return NextResponse.json({ error: "Products not found" }, { status: 400 });
    }

    const priceMap = new Map(
      products.map((p) => [p.slug, { priceCents: p.price_cents, stock: p.stock, productId: p.id, emoji: p.emoji, gradient: p.gradient }])
    );

    // Calculate subtotal and validate stock
    let subtotal = 0;
    let itemCount = 0;
    const orderItems: Array<{
      product_id: string;
      name: string;
      slug: string;
      emoji: string | null;
      gradient: string | null;
      unit_price_cents: number;
      qty: number;
      line_total_cents: number;
    }> = [];

    for (const item of cartItems) {
      const dbProduct = priceMap.get(item.slug);
      if (!dbProduct) {
        return NextResponse.json({ error: `Product ${item.name} no longer available` }, { status: 400 });
      }
      if (dbProduct.stock < item.qty) {
        return NextResponse.json({ error: `Insufficient stock for ${item.name}` }, { status: 400 });
      }
      const unitPrice = dbProduct.priceCents;
      const lineTotal = unitPrice * item.qty;
      subtotal += lineTotal;
      itemCount += item.qty;
      orderItems.push({
        product_id: dbProduct.productId,
        name: item.name,
        slug: item.slug,
        emoji: dbProduct.emoji,
        gradient: dbProduct.gradient,
        unit_price_cents: unitPrice,
        qty: item.qty,
        line_total_cents: lineTotal,
      });
    }

    // Apply promo if provided
    let discount = 0;
    let freeShipping = false;

    if (promoCode) {
      const normalized = promoCode.trim().toUpperCase();
      const { data: promoData } = await supabase
        .from("promo_codes")
        .select("code, type, value, active, min_subtotal_cents, expires_at")
        .eq("code", normalized)
        .maybeSingle();

      if (promoData && promoData.active && (!promoData.expires_at || new Date(promoData.expires_at).getTime() > Date.now())) {
        if (subtotal >= promoData.min_subtotal_cents) {
          if (promoData.type === "percent") {
            discount = Math.round((subtotal * promoData.value) / 100);
          } else if (promoData.type === "fixed") {
            discount = Math.min(promoData.value, subtotal);
          } else if (promoData.type === "free_shipping") {
            freeShipping = true;
          }
        }
      }
    }

    const storeConfig = await getServerStoreConfig();
    const afterDiscount = subtotal - discount;

    // Calculate shipping
    const shippingCost = freeShipping || afterDiscount >= storeConfig.free_shipping_threshold_cents
      ? 0
      : delivery.delivery === "express"
        ? storeConfig.express_shipping_cents
        : storeConfig.standard_shipping_cents;

    // Calculate tax (live from DB settings)
    const tax = Math.round((afterDiscount * storeConfig.tax_rate_bps) / 10000);
    const total = afterDiscount + shippingCost + tax;

    // Ensure profile and customer exist
    const profileId = await ensureProfile(supabase, contact.email, contact.name);
    const customerId = await ensureCustomer(
      supabase,
      profileId,
      contact.email,
      contact.name,
      contact.phone,
      shipping.city
    );

    // Create order number (retry on collision)
    let orderNumber = generateOrderNumber();
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (!existing) break;
      orderNumber = generateOrderNumber();
    }

    // Insert order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: profileId,
        email: contact.email,
        name: contact.name,
        phone: contact.phone,
        address1: shipping.address1,
        address2: shipping.address2,
        city: shipping.city,
        state: shipping.state,
        postal_code: shipping.postal_code,
        country: shipping.country,
        subtotal_cents: subtotal,
        discount_cents: discount,
        shipping_cents: shippingCost,
        tax_cents: tax,
        total_cents: total,
        currency: "PKR",
        status: "pending",
        payment_method: "cod",
        payment_status: "pending",
        item_count: itemCount,
        delivery_method: delivery.delivery,
        source: "api-checkout",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Failed to create order. Please try again." }, { status: 500 });
    }

    // Insert order items
    const itemsWithOrderId = orderItems.map((item) => ({ ...item, order_id: order.id }));
    const { error: itemsError } = await supabase.from("order_items").insert(itemsWithOrderId);

    if (itemsError) {
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "Failed to create order items. Please try again." }, { status: 500 });
    }

    // Decrement stock for each product
    for (const item of orderItems) {
      const { data: product } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single();
      if (product) {
        const newStock = Math.max(0, product.stock - item.qty);
        await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", item.product_id);
      }
    }

    // Log order event
    await supabase.from("order_events").insert({
      order_id: order.id,
      type: "order.created",
      source: "api-checkout",
      path: "/checkout",
    });

    return NextResponse.json({ success: true, orderNumber });
  } catch (err) {
    console.error("Checkout API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}