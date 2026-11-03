-- Migration: 018_add_is_featured
-- Add is_featured column to products table (missing from original migration)

alter table public.products add column if not exists is_featured boolean not null default false;
