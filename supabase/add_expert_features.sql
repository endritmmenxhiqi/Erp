-- ========================================================
-- AGONI ERP - Modulet e Expert ERP + AI Integration
-- Klientet, Furnitoret, Ofertat/Porosite, Tavolinat (Restorant)
-- ========================================================

-- 1. KLIENTET (Clients / CRM)
CREATE TABLE IF NOT EXISTS public.clients (
  id serial PRIMARY KEY,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  fiscal_number text,
  credit_limit numeric(12,2) DEFAULT 0,
  balance numeric(12,2) DEFAULT 0, -- Borxhi aktual
  notes text,
  ai_notes text, -- AI risk score & blerjet e preferuara
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. FURNITORET (Suppliers)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id serial PRIMARY KEY,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  fiscal_number text,
  balance numeric(12,2) DEFAULT 0, -- Sa i kemi borxh
  payment_terms text DEFAULT '30 dite',
  notes text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. OFERTAT / POROSITE / PROFORMAT (Quotations & Orders)
CREATE TABLE IF NOT EXISTS public.orders (
  id serial PRIMARY KEY,
  order_number text NOT NULL,
  order_type text CHECK (order_type IN ('Oferte', 'Porosi', 'Proforme')) DEFAULT 'Porosi',
  status text CHECK (status IN ('Draft', 'Derguar', 'Pranuar', 'Faturuar', 'Anuluar')) DEFAULT 'Draft',
  client_id integer REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  vat_rate numeric(5,2) DEFAULT 0,
  discount numeric(12,2) DEFAULT 0,
  delivery_date date,
  notes text,
  ai_summary text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
  id serial PRIMARY KEY,
  order_id integer REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL,
  total numeric(12,2) NOT NULL,
  barcode text,
  unit text DEFAULT 'cope',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- 5. TAVOLINAT / RESTORANT & KAFENE
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id serial PRIMARY KEY,
  table_number text NOT NULL,
  zone text DEFAULT 'Brenda', -- Brenda, Terasa, VIP, Kati 2
  status text CHECK (status IN ('E lire', 'E zene', 'E rezervuar')) DEFAULT 'E lire',
  active_bill_total numeric(12,2) DEFAULT 0,
  current_order jsonb DEFAULT '[]'::jsonb,
  waiter_name text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own clients" ON public.clients FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own suppliers" ON public.suppliers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own orders" ON public.orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own order items" ON public.order_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tables" ON public.restaurant_tables FOR ALL USING (auth.uid() = user_id);
