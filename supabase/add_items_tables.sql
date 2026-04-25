-- Create Sale Items table
CREATE TABLE IF NOT EXISTS public.sale_items (
  id serial primary key,
  sale_id integer references public.sales(id) on delete cascade not null,
  item_name text not null,
  quantity numeric not null,
  price numeric not null,
  unit text,
  barcode text,
  user_id uuid references auth.users(id) on delete cascade not null
);

-- Create Purchase Items table
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id serial primary key,
  purchase_id integer references public.purchases(id) on delete cascade not null,
  item_name text not null,
  quantity numeric not null,
  cost_price numeric not null,
  selling_price numeric,
  unit text,
  barcode text,
  user_id uuid references auth.users(id) on delete cascade not null
);

-- Enable RLS
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own sale items." ON public.sale_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sale items." ON public.sale_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own purchase items." ON public.purchase_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own purchase items." ON public.purchase_items FOR INSERT WITH CHECK (auth.uid() = user_id);
