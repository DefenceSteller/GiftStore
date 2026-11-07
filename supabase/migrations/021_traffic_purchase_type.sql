-- Migration: 021_traffic_purchase_type
-- Allow the "purchase" event type in traffic_events (used by the
-- PurchaseTracker on /order-success to feed the conversion funnel).

alter table public.traffic_events
  drop constraint if exists traffic_events_type_check;

alter table public.traffic_events
  add constraint traffic_events_type_check
  check (type in ('pageview','product_view','add_to_cart','checkout_start','purchase'));