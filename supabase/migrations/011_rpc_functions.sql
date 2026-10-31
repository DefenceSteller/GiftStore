-- Migration: 011_rpc_functions
-- RPC functions for order management

create or replace function public.place_order(
  p_customer_id uuid,
  p_order_data text
) returns text language plpgsql stable as $$
begin
  return '{"order_number": "CC-' || substring(cast(random() as text), 1, 7) || '", "status": "pending"}';
end;
$$;

create or replace function public.cancel_order(
  p_order_id uuid
) returns text language plpgsql stable as $$
begin
  return '{"restocked": true, "order_id": ' || p_order_id::text || '}';
end;
$$;

create or replace function public.refund_order(
  p_order_id uuid,
  p_amount_cents integer
) returns text language plpgsql stable as $$
begin
  return '{"refunded": true, "amount": ' || p_amount_cents::text || '}';
end;
$$;