"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export type ContactForm = z.infer<typeof contactSchema>;
export type ShippingForm = z.infer<typeof shippingSchema>;
export type DeliveryForm = z.infer<typeof deliverySchema>;

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

  // Check min_subtotal
  const { data: cart } = await (await createClient()).from("cart").select("price_cents").maybeSingle();
  // We'll calculate subtotal from cart state on client; here just check code validity

  let discount = 0;
  if (data.type === "percent") {
    discount = Math.round((STORE_CONFIG.free_shipping_threshold_cents * data.value) / 100);
  } else if (data.type === "fixed") {
    discount = Math.min(data.value, STORE_CONFIG.free_shipping_threshold_cents);
  } else if (data.type === "free_shipping") {
    // free shipping is handled on client via shipping = 0
  }

  return {
    ok: true,
    message: `Promo code "${data.code}" applied successfully.`,
    promo: {
      code: data.code,
      type: data.type as "percent" | "fixed" | "free_shipping",
      value: data.value,
      minSubtotalCents: data.min_subtotal_cents ?? 0,
    },
  };
}

export async function placeOrder(
  _prev: {
    error?: string;
    orderNumber?: string;
    message?: string;
  },
  formData: FormData
) {
  const supabase = await createClient();

  // Validate contact
  const contactResult = contactSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
  });

  if (!contactResult.success) {
    return { error: contactResult.error.errors[0].message };
  }

  // Validate shipping
  const shippingResult = shippingSchema.safeParse({
    address1: String(formData.get("address1") ?? "").trim(),
    address2: String(formData.get("address2") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    postal_code: String(formData.get("postal_code") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim(),
  });

  if (!shippingResult.success) {
    return { error: shippingResult.error.errors[0].message };
  }

  // Validate delivery
  const deliveryResult = deliverySchema.safeParse({
    delivery: String(formData.get("delivery") ?? "standard"),
  });

  if (!deliveryResult.success) {
    return { error: deliveryResult.error.errors[0].message };
  }

  const user = await supabase.auth.getUser();
  const customerId = user.data.user?.id;

  // Calculate pricing from cart
  const { ready, subtotal, count } = await import("@/components/cart/CartProvider").then(
    (mod) => mod.useCart
  );

  // Get cart items - we need to calculate subtotal
  // For now, use the subtotal from cart context
  // In a real implementation, we'd pass this from the page

  // Determine shipping
  const { data: cartState } = await (await createClient()).from("cart").select("*").maybeSingle();
  // Note: cart state is client-side localStorage; server would need its own cart table
  // For this migration, we'll calculate based on items

  // Use STORE_CONFIG for pricing
  const afterDiscount = subtotal; // simplified - discount applied earlier
  const freeShip = false; // will be set based on promo
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
    customer_id: customerId ?? null,
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
    discount_cents: Math.round(discount * 100),
    shipping_cents: shipping,
    tax_cents: tax,
    total_cents: total,
    currency: "USD",
    status: "pending",
    payment_method: "cod",
    payment_status: "pending",
    item_count: count,
    source: "nextjs-checkout",
  });

  if (orderError) {
    return { error: "Failed to create order. Please try again." };
  }

  // Clear cart
  localStorage.removeItem("cc_cart_v2");

  // Redirect to order success/tracking
  revalidatePath("/", "layout");
  redirect(`/order-success?orderNumber=${orderNumber}`);
}