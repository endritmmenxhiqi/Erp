-- Enable DELETE policy for sales and sale_items
CREATE POLICY "Users can delete own sales." ON public.sales FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sale items." ON public.sale_items FOR DELETE USING (auth.uid() = user_id);

-- Enable DELETE policy for purchases and purchase_items
CREATE POLICY "Users can delete own purchases." ON public.purchases FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own purchase items." ON public.purchase_items FOR DELETE USING (auth.uid() = user_id);

-- Fix any existing negative stock values to 0
UPDATE public.stock SET quantity = 0 WHERE quantity < 0;

-- Add a CHECK constraint to ensure stock quantity cannot be negative
ALTER TABLE public.stock ADD CONSTRAINT check_stock_quantity_nonnegative CHECK (quantity >= 0);
