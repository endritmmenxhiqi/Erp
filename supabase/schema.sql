-- Existing profiles table and trigger (assumed)
-- ...

-- Create Sales table
create table public.sales (
  id serial primary key,
  invoice_num text not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  total_amount decimal(12,2) not null,
  vat_rate decimal(5,2) default 0,
  type text check (type in ('Mall', 'Shërbim')) default 'Mall',
  user_id uuid references auth.users on delete cascade not null,
  unique(invoice_num, user_id)
);

-- Create Purchases table
create table public.purchases (
  id serial primary key,
  invoice_num text not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  total_cost decimal(12,2) not null,
  seller_fiscal_num text,
  image_url text,
  user_id uuid references auth.users on delete cascade not null,
  unique(invoice_num, user_id)
);

-- Create Stock table
create table public.stock (
  id serial primary key,
  item_name text not null,
  quantity decimal(12,3) default 0,
  unit text default 'copë',
  user_id uuid references auth.users on delete cascade not null,
  unique(item_name, user_id)
);

-- Enable RLS
alter table public.sales enable row level security;
alter table public.purchases enable row level security;
alter table public.stock enable row level security;

-- RLS Policies
create policy "Users can view own sales." on sales for select using (auth.uid() = user_id);
create policy "Users can insert own sales." on sales for insert with check (auth.uid() = user_id);

create policy "Users can view own purchases." on purchases for select using (auth.uid() = user_id);
create policy "Users can insert own purchases." on purchases for insert with check (auth.uid() = user_id);

create policy "Users can view own stock." on stock for select using (auth.uid() = user_id);
create policy "Users can update own stock." on stock for all using (auth.uid() = user_id);
create policy "Users can insert own stock." on stock for insert with check (auth.uid() = user_id);
