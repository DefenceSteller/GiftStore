-- Migration: 020_product_image_url
-- Allow admins to set a custom product image URL (e.g. hosted on Cloudinary/imgur).
-- Falls back to the existing SVG at /assets/img/products/{slug}.svg when empty.

alter table public.products
  add column if not exists image_url text null;
