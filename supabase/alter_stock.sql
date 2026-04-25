-- Add barcode and selling_price to stock table
ALTER TABLE public.stock 
ADD COLUMN IF NOT EXISTS barcode text,
ADD COLUMN IF NOT EXISTS selling_price decimal(12,2);

-- Create index for faster barcode lookup
CREATE INDEX IF NOT EXISTS idx_stock_barcode ON public.stock(barcode);

-- Update the handle_stock_update function to handle the new columns
CREATE OR REPLACE FUNCTION public.handle_stock_update(
  p_item_name text,
  p_quantity_change numeric,
  p_unit text,
  p_user_id uuid,
  p_barcode text default null,
  p_selling_price numeric default null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.stock (item_name, quantity, unit, user_id, barcode, selling_price)
  VALUES (p_item_name, p_quantity_change, p_unit, p_user_id, p_barcode, p_selling_price)
  ON CONFLICT (item_name, user_id)
  DO UPDATE SET
    quantity = public.stock.quantity + EXCLUDED.quantity,
    unit = EXCLUDED.unit,
    barcode = COALESCE(EXCLUDED.barcode, public.stock.barcode),
    selling_price = COALESCE(EXCLUDED.selling_price, public.stock.selling_price);
END;
$$;
