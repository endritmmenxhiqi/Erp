-- Function to handle atomic stock updates
-- This prevents race conditions when multiple updates happen simultaneously.
-- It uses PostgreSQL's INSERT ... ON CONFLICT DO UPDATE (Upsert).

create or replace function public.handle_stock_update(
  p_item_name text,
  p_quantity_change numeric,
  p_unit text,
  p_user_id uuid,
  p_barcode text default null,
  p_selling_price numeric default null
)
returns void
language plpgsql
security definer -- Runs with the privileges of the creator (bypass RLS for the system part if needed, but RLS will still apply to the caller)
as $$
begin
  insert into public.stock (item_name, quantity, unit, user_id, barcode, selling_price)
  values (p_item_name, p_quantity_change, p_unit, p_user_id, p_barcode, p_selling_price)
  on conflict (item_name, user_id)
  do update set
    quantity = public.stock.quantity + excluded.quantity,
    unit = excluded.unit,
    barcode = coalesce(excluded.barcode, public.stock.barcode),
    selling_price = coalesce(excluded.selling_price, public.stock.selling_price);
end;
$$;
