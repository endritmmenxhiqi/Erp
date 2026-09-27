-- ========================================================
-- AGONI ERP - Modulet e të Gjitha Industrive (Sipas Expert ERP)
-- 1. Zgjedhja e Llojit te Biznesit te Profilet
-- 2. Rent-a-Car
-- 3. Hotel & Rezervime
-- 4. Auto Servis & Mekanike
-- 5. Prodhim (Normativat & Recetat)
-- 6. Dogana & DUD (Distribucion me zhdoganim)
-- ========================================================

-- Shto llojin e biznesit te profili
ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'market';

-- 1. RENT-A-CAR (Flota & Kontratat)
CREATE TABLE IF NOT EXISTS public.rental_vehicles (
  id serial PRIMARY KEY,
  plate_number text NOT NULL,
  make_model text NOT NULL,
  year_manufacture integer,
  daily_rate numeric(10,2) NOT NULL,
  mileage integer DEFAULT 0,
  status text CHECK (status IN ('E lire', 'E dhene me qira', 'Ne servis')) DEFAULT 'E lire',
  fuel_type text DEFAULT 'Dizel',
  transmission text DEFAULT 'Automatik',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.rental_contracts (
  id serial PRIMARY KEY,
  contract_number text NOT NULL,
  vehicle_id integer REFERENCES public.rental_vehicles(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_id_card text,
  client_phone text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  total_price numeric(10,2) NOT NULL,
  deposit numeric(10,2) DEFAULT 0,
  status text CHECK (status IN ('Aktive', 'E perfunduar', 'E anuluar')) DEFAULT 'Aktive',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. HOTEL (Dhomat & Rezervimet)
CREATE TABLE IF NOT EXISTS public.hotel_rooms (
  id serial PRIMARY KEY,
  room_number text NOT NULL,
  room_type text DEFAULT 'Standard', -- Standard, Deluxe, Suite
  price_per_night numeric(10,2) NOT NULL,
  capacity integer DEFAULT 2,
  status text CHECK (status IN ('E lire', 'E zene', 'Ne pastrim', 'Ne mirembajtje')) DEFAULT 'E lire',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.hotel_reservations (
  id serial PRIMARY KEY,
  reservation_code text NOT NULL,
  room_id integer REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_phone text,
  check_in date NOT NULL,
  check_out date NOT NULL,
  total_price numeric(10,2) NOT NULL,
  payment_status text CHECK (payment_status IN ('E paguar', 'E papaguar', 'Avans')) DEFAULT 'E papaguar',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. AUTO SERVIS & MEKANIKE (Urdheresat e Riparimit)
CREATE TABLE IF NOT EXISTS public.service_orders (
  id serial PRIMARY KEY,
  order_number text NOT NULL,
  vehicle_plate text NOT NULL,
  vehicle_model text NOT NULL,
  client_name text NOT NULL,
  client_phone text,
  problem_description text NOT NULL,
  parts_cost numeric(10,2) DEFAULT 0,
  labor_cost numeric(10,2) DEFAULT 0,
  total_cost numeric(10,2) DEFAULT 0,
  status text CHECK (status IN ('Ne pritje', 'Ne riparim', 'Gati', 'Dorezuar')) DEFAULT 'Ne pritje',
  mechanic_name text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. PRODHIM & NORMATIVA (BOM - Bill of Materials)
CREATE TABLE IF NOT EXISTS public.production_recipes (
  id serial PRIMARY KEY,
  recipe_name text NOT NULL,
  output_item_name text NOT NULL,
  output_quantity numeric(10,2) DEFAULT 1,
  raw_materials jsonb DEFAULT '[]'::jsonb, -- [{ "name": "Miell", "qty": 50, "unit": "kg" }]
  estimated_cost numeric(10,2) DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. DOGANA & DUD (Deklarata Doganore e Mallit)
CREATE TABLE IF NOT EXISTS public.customs_declarations (
  id serial PRIMARY KEY,
  dud_number text NOT NULL,
  origin_country text DEFAULT 'Gjermani',
  invoice_value numeric(12,2) NOT NULL,
  customs_duty numeric(12,2) DEFAULT 0, -- Dogana (p.sh. 10%)
  excise_duty numeric(12,2) DEFAULT 0,  -- Akciza
  vat_amount numeric(12,2) DEFAULT 0,   -- TVSH Doganore 18%
  terminal_fee numeric(10,2) DEFAULT 0, -- Kostoja e terminalit
  total_landed_cost numeric(12,2) NOT NULL, -- Kostoja totale e zhdoganimit
  status text CHECK (status IN ('Ne proces', 'E zhdoganuar', 'Ne pritje te pageses')) DEFAULT 'E zhdoganuar',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.rental_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage rental vehicles" ON public.rental_vehicles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage rental contracts" ON public.rental_contracts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage hotel rooms" ON public.hotel_rooms FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage hotel reservations" ON public.hotel_reservations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage service orders" ON public.service_orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage production recipes" ON public.production_recipes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage customs declarations" ON public.customs_declarations FOR ALL USING (auth.uid() = user_id);
