import { createClient } from "@/lib/supabase/server";

export async function getOrderByNumber(
  orderNumber: string,
  email?: string
) {
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      customers(name, phone, city)
    `
    )
    .eq("order_number", orderNumber);

  if (email) {
    query = query.eq("email", email);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    order_number: data.order_number,
    status: data.status,
    subtotal_cents: data.subtotal_cents,
    discount_cents: data.discount_cents,
    shipping_cents: data.shipping_cents,
    tax_cents: data.tax_cents,
    total_cents: data.total_cents,
    email: data.email,
    name: data.name,
    phone: data.phone,
    address1: data.address1,
    address2: data.address2,
    city: data.city,
    country: data.country,
    items: data.items || [],
    created_at: data.placed_at,
  };
}