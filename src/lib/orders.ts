import { createClient } from "@/lib/supabase/server";

export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  gradient: string | null;
  image: string;
  price_cents: number;
};

export type OrderSummary = {
  id: string;
  order_number: string;
  status: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  email: string;
  name: string;
  phone: string | null;
  address1: string;
  address2: string | null;
  city: string;
  country: string;
  items: OrderItem[];
  created_at: string;
};

/**
 * Fetch a single order by order number (optionally scoped to an email).
 * Line items are read from the order_items table (orders has no items column).
 */
export async function getOrderByNumber(
  orderNumber: string,
  email?: string
): Promise<OrderSummary | null> {
  const supabase = await createClient();

  let query = supabase.from("orders").select("*").eq("order_number", orderNumber);

  if (email) {
    query = query.eq("email", email);
  }

  const { data: order, error } = await query.maybeSingle();

  if (error || !order) {
    return null;
  }

  // Fetch line items for this order.
  const { data: itemRows } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);

  const items: OrderItem[] = (itemRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    qty: row.qty,
    gradient: row.gradient,
    image: row.slug ? `/assets/img/products/${row.slug}.svg` : "",
    price_cents: row.unit_price_cents,
  }));

  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    subtotal_cents: order.subtotal_cents,
    discount_cents: order.discount_cents,
    shipping_cents: order.shipping_cents,
    tax_cents: order.tax_cents,
    total_cents: order.total_cents,
    email: order.email,
    name: order.name,
    phone: order.phone,
    address1: order.address1,
    address2: order.address2,
    city: order.city,
    country: order.country,
    items,
    created_at: order.placed_at,
  };
}
