"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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
  postal_code: z.string().min(3, "Postal/ZIP code required").max(12, "Postal code too long"),
  country: z.string().min(1, "Country required"),
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

export type ContactForm = z.infer<typeof contactSchema>;
export type ShippingForm = z.infer<typeof shippingSchema>;
export type DeliveryForm = z.infer<typeof deliverySchema>;
export type CartItemInput = z.infer<typeof cartItemSchema>;

export type ValidatedPromo = {
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  minSubtotalCents: number;
  description?: string;
};

export async function validatePromo(code: string) {
  const supabase = await createClient();
  const normalized = code.trim().toUpperCase();

  const { data, error } = await supabase
    .from("promo_codes")
    .select("code, type, value, active, min_subtotal_cents, description, expires_at")
    .eq("code", normalized)
    .maybeSingle();

  if (error) {
    return { ok: false, message: "Error checking promo code." };
  }

  if (!data || !data.active) {
    return { ok: false, message: "Promo code is not active." };
  }

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, message: "Promo code has expired." };
  }

  let discount = 0;
  if (data.type === "percent") {
    discount = Math.round((STORE_CONFIG.free_shipping_threshold_cents * data.value) / 100);
  } else if (data.type === "fixed") {
    discount = Math.min(data.value, STORE_CONFIG.free_shipping_threshold_cents);
  }

  return {
    ok: true,
    message: `Promo code "${data.code}" applied successfully.`,
    promo: {
      code: data.code,
      type: data.type as "percent" | "fixed" | "free_shipping",
      value: data.value,
      minSubtotalCents: data.min_subtotal_cents ?? 0,
      description: data.description ?? "",
    },
  };
}

function generateOrderNumber(): string {
  return "CC-" + Math.random().toString(36).substring(2, 9).toUpperCase();
}

async function ensureProfile(supabase: ReturnType<typeof createServiceClient>, email: string, name: string): Promise<string> {
  // Check if profile exists for this email
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    return existingProfile.id;
  }

  // Create new profile for guest checkout
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

async function ensureCustomer(supabase: ReturnType<typeof createServiceClient>, profileId: string, email: string, name: string, phone: string | null, city: string | null): Promise<string> {
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("profiles_id", profileId)
    .maybeSingle();

  if (existingCustomer) {
    // Update customer info
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

export async function placeOrder(
  _prev: {
    error?: string;
    orderNumber?: string;
    message?: string;
  },
  formData: FormData
) {
  // Use service role for checkout — guest users have no authenticated session,
  // and the orders table has no INSERT policy for the anon role.
  const supabase = createServiceClient();

  // Parse and validate contact
  const contactResult = contactSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
  });

  if (!contactResult.success) {
    return { error: contactResult.error.issues[0].message };
  }

  // Parse and validate shipping
  const shippingResult = shippingSchema.safeParse({
    address1: String(formData.get("address1") ?? "").trim(),
    address2: String(formData.get("address2") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    postal_code: String(formData.get("postal_code") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim(),
  });

  if (!shippingResult.success) {
    return { error: shippingResult.error.issues[0].message };
  }

  // Parse and validate delivery
  const deliveryResult = deliverySchema.safeParse({
    delivery: String(formData.get("delivery") ?? "standard"),
  });

  if (!deliveryResult.success) {
    return { error: deliveryResult.error.issues[0].message };
  }

  // Parse cart items from form data (passed as JSON)
  const cartItemsRaw = formData.get("cartItems");
  if (!cartItemsRaw) {
    return { error: "Cart is empty" };
  }

  let cartItems: CartItemInput[];
  try {
    cartItems = JSON.parse(String(cartItemsRaw));
  } catch {
    return { error: "Invalid cart data" };
  }

  const cartValidation = z.array(cartItemSchema).safeParse(cartItems);
  if (!cartValidation.success) {
    return { error: "Invalid cart items" };
  }

  // Re-price from DB: fetch product prices by slug
  const slugs = cartItems.map((item) => item.slug);
  const { data: products } = await supabase
    .from("products")
    .select("id, slug, price_cents, stock, name, emoji, gradient")
    .in("slug", slugs)
    .eq("is_active", true);

  if (!products || products.length === 0) {
    return { error: "Products not found" };
  }

  // Build price map from DB
  const priceMap = new Map(products.map((p) => [p.slug, { priceCents: p.price_cents, stock: p.stock, productId: p.id, emoji: p.emoji, gradient: p.gradient }]));

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

  for (const item of cartValidation.data) {
    const dbProduct = priceMap.get(item.slug);
    if (!dbProduct) {
      return { error: `Product ${item.name} no longer available` };
    }
    if (dbProduct.stock < item.qty) {
      return { error: `Insufficient stock for ${item.name}` };
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
  const promoCode = String(formData.get("promoCode") ?? "").trim().toUpperCase();
  let discount = 0;
  let freeShipping = false;

  if (promoCode) {
    const promoResult = await validatePromo(promoCode);
    if (promoResult.ok && promoResult.promo) {
      const promo = promoResult.promo;
      if (subtotal >= promo.minSubtotalCents) {
        if (promo.type === "percent") {
          discount = Math.round((subtotal * promo.value) / 100);
        } else if (promo.type === "fixed") {
          discount = Math.min(promo.value, subtotal);
        } else if (promo.type === "free_shipping") {
          freeShipping = true;
        }
      }
    }
  }

  const afterDiscount = subtotal - discount;

  // Calculate shipping
  const shipping = freeShipping || afterDiscount >= STORE_CONFIG.free_shipping_threshold_cents
    ? 0
    : deliveryResult.data.delivery === "express"
      ? STORE_CONFIG.express_shipping_cents
      : STORE_CONFIG.standard_shipping_cents;

  // Calculate tax (5% = 500 bps)
  const tax = Math.round((afterDiscount * STORE_CONFIG.tax_rate_bps) / 10000);
  const total = afterDiscount + shipping + tax;

  // Ensure profile and customer exist
  const profileId = await ensureProfile(supabase, contactResult.data.email, contactResult.data.name);
  const customerId = await ensureCustomer(
    supabase,
    profileId,
    contactResult.data.email,
    contactResult.data.name,
    contactResult.data.phone,
    shippingResult.data.city
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
      customer_id: profileId, // references profiles(id)
      email: contactResult.data.email,
      name: contactResult.data.name,
      phone: contactResult.data.phone,
      address1: shippingResult.data.address1,
      address2: shippingResult.data.address2,
      city: shippingResult.data.city,
      state: shippingResult.data.state,
      postal_code: shippingResult.data.postal_code,
      country: shippingResult.data.country,
      subtotal_cents: subtotal,
      discount_cents: discount,
      shipping_cents: shipping,
      tax_cents: tax,
      total_cents: total,
      currency: "USD",
      status: "pending",
      payment_method: String(formData.get("payment_method") ?? "cod"),
      payment_status: "pending",
      item_count: itemCount,
      delivery_method: deliveryResult.data.delivery,
      source: "nextjs-checkout",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return { error: "Failed to create order. Please try again." };
  }

  // Insert order items
  const itemsWithOrderId = orderItems.map((item) => ({
    ...item,
    order_id: order.id,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(itemsWithOrderId);

  if (itemsError) {
    // Rollback order (delete)
    await supabase.from("orders").delete().eq("id", order.id);
    return { error: "Failed to create order items. Please try again." };
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
      const { error: stockError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.product_id);
      if (stockError) {
        console.error("Stock decrement failed:", stockError);
      }
    }
  }

  // Log order event
  await supabase.from("order_events").insert({
    order_id: order.id,
    type: "order.created",
    source: "nextjs-checkout",
    path: "/checkout",
  });

  revalidatePath("/", "layout");
  redirect(`/order-success?orderNumber=${orderNumber}`);
}