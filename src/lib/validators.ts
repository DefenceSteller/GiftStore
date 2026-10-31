import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z
    .string()
    .min(7, "Phone too short")
    .max(15, "Phone too long")
    .regex(/^[0-9+\s]+$/, "Phone must contain only numbers and +"),
});

export const shippingAddressSchema = z.object({
  address1: z.string().min(1, "Address line 1 required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City required"),
  state: z.string().min(1, "State required"),
  postal_code: z
    .string()
    .regex(/^[0-9]{6}$/, "Postal code must be 6 digits")
    .optional(),
  country: z.string().min(1, "Country required"),
});

export const passwordSchema = z.object({
  password: z
    .string()
    .min(1, "Password is required")
    .refine((val) => val.length >= 6, "Password must be at least 6 characters"),
});

export const productSchema = z.object({
  name: z.string().min(1, "Name required"),
  tagline: z.string().optional(),
  description: z.string().optional(),
  category: z.string().min(1, "Category required"),
  price_cents: z.number().int().min(1, "Price must be at least 1 cent"),
  compare_at_cents: z
    .number()
    .int()
    .min(0, "Compare at price must be 0 or positive")
    .optional(),
  emoji: z.string().min(1, "Emoji required"),
  gradient: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  rating: z
    .number()
    .min(0, "Rating must be at least 0")
    .max(5, "Rating must be at most 5")
    .optional()
    .default(0),
  review_count: z.number().int().min(0).optional().default(0),
  stock: z.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
  sort_order: z.number().int().min(0).optional().default(0),
});

export const promoCodeSchema = z.object({
  code: z.string().toUpperCase().min(1, "Code required").max(20, "Code too long"),
  type: z.enum(["percent", "fixed", "free_shipping"]),
  value: z.number().int().min(1, "Value must be at least 1"),
  min_subtotal_cents: z
    .number()
    .int()
    .min(0, "Min subtotal must be 0 or positive")
    .optional(),
});

export const shippingMethodSchema = z.object({
  delivery: z.enum(["standard", "express"]),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum([
    "pending",
    "paid",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ]),
});

export const customerSearchSchema = z.object({
  query: z.string().min(1, "Search query required").max(100),
});

export const settingsSchema = z.object({
  store_name: z.string().min(1, "Store name required").max(100),
  currency: z.enum(["USD", "PKR"]).default("USD"),
  free_shipping_threshold_cents: z.number().int().min(0).optional(),
  standard_shipping_cents: z.number().int().min(0).optional(),
  express_shipping_cents: z.number().int().min(0).optional(),
  tax_rate_bps: z.number().int().min(0).optional(),
  delivery_days_standard: z.string().optional(),
  delivery_days_express: z.string().optional(),
  announcement_banner: z.string().optional(),
});

export const adminPasswordSchema = z.object({
  current_password: z.string().min(1, "Current password required"),
  new_password: z
    .string()
    .min(6, "New password must be at least 6 characters"),
});