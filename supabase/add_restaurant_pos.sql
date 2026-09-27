-- ========================================================
-- AGONI ERP - Restaurant POS, Business Type & Role System
-- Migration for atomic table→sale→stock workflow
-- ========================================================

-- 1. Add business_type and user_role to profiles (for registration)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'market',
  ADD COLUMN IF NOT EXISTS user_role text DEFAULT 'owner';

-- 2. Add payment_method to sales for restaurant POS
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'Cash';

-- 3. Table orders (persist restaurant orders per-table)
CREATE TABLE IF NOT EXISTS public.table_orders (
  id serial PRIMARY KEY,
  table_id integer NOT NULL,
  item_name text NOT NULL,
  barcode text,
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  unit text DEFAULT 'cope',
  price numeric(12,2) NOT NULL DEFAULT 0,
  note text,
  status text DEFAULT 'active', -- active, served, cancelled
  waiter_id integer REFERENCES public.workers(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Add waiter_id to restaurant_tables
ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS waiter_id integer REFERENCES public.workers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capacity integer DEFAULT 4,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 5. RLS Policies for table_orders
ALTER TABLE public.table_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own table orders"
  ON public.table_orders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_table_orders_table_id ON public.table_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_table_orders_user_id ON public.table_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_table_orders_status ON public.table_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON public.sales(payment_method);

-- 7. Allow industry-specific roles for workers (remove strict check if exists)
ALTER TABLE public.workers DROP CONSTRAINT IF EXISTS workers_role_check;

