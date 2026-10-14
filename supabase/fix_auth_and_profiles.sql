-- ========================================================
-- AGONI ERP - Fix Auth, Profiles Trigger & Login Lookup
-- Ekzekutojeni këtë skript në Supabase SQL Editor
-- ========================================================

-- 1. Sigurohu që tabela profiles ka të gjitha kolonat e nevojshme
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  business_name text,
  fiscal_number text,
  address text,
  phone_number text,
  business_type text DEFAULT 'market',
  user_role text DEFAULT 'owner',
  role text DEFAULT 'business_admin',
  manager_pin text DEFAULT '1234',
  ai_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Shto kolonat nëse tabela profiles ekzistonte më herët pa to
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS fiscal_number text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'market',
  ADD COLUMN IF NOT EXISTS user_role text DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'business_admin',
  ADD COLUMN IF NOT EXISTS manager_pin text DEFAULT '1234',
  ADD COLUMN IF NOT EXISTS ai_enabled boolean DEFAULT true;

-- 2. Index për kërkim të shpejtë sipas numrit fiskal
CREATE INDEX IF NOT EXISTS idx_profiles_fiscal_number ON public.profiles(fiscal_number);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. Sinkronizo (Backfill) çdo përdorues ekzistues nga auth.users tek profiles
INSERT INTO public.profiles (
  id,
  email,
  business_name,
  fiscal_number,
  address,
  phone_number,
  business_type,
  user_role,
  role
)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'business_name', 'Biznesi Im'),
  COALESCE(raw_user_meta_data->>'fiscal_number', ''),
  COALESCE(raw_user_meta_data->>'address', ''),
  COALESCE(raw_user_meta_data->>'phone_number', ''),
  COALESCE(raw_user_meta_data->>'business_type', 'market'),
  COALESCE(raw_user_meta_data->>'user_role', 'owner'),
  COALESCE(raw_user_meta_data->>'role', 'business_admin')
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  business_name = COALESCE(NULLIF(EXCLUDED.business_name, ''), public.profiles.business_name),
  fiscal_number = COALESCE(NULLIF(EXCLUDED.fiscal_number, ''), public.profiles.fiscal_number),
  address = COALESCE(NULLIF(EXCLUDED.address, ''), public.profiles.address),
  phone_number = COALESCE(NULLIF(EXCLUDED.phone_number, ''), public.profiles.phone_number),
  business_type = COALESCE(NULLIF(EXCLUDED.business_type, ''), public.profiles.business_type),
  user_role = COALESCE(NULLIF(EXCLUDED.user_role, ''), public.profiles.user_role);

-- 3.1 Konfirmo automatikisht të gjithë përdoruesit në auth.users (që mos të kërkojë verifikim me email për kyçje)
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- 4. Trigger automatik: Kur regjistrohet një përdorues në auth.users, krijohet menjëherë profili
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    business_name,
    fiscal_number,
    address,
    phone_number,
    business_type,
    user_role,
    role
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'business_name', 'Biznesi Im'),
    COALESCE(new.raw_user_meta_data->>'fiscal_number', ''),
    COALESCE(new.raw_user_meta_data->>'address', ''),
    COALESCE(new.raw_user_meta_data->>'phone_number', ''),
    COALESCE(new.raw_user_meta_data->>'business_type', 'market'),
    COALESCE(new.raw_user_meta_data->>'user_role', 'owner'),
    COALESCE(new.raw_user_meta_data->>'role', 'business_admin')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    business_name = COALESCE(NULLIF(EXCLUDED.business_name, ''), public.profiles.business_name),
    fiscal_number = COALESCE(NULLIF(EXCLUDED.fiscal_number, ''), public.profiles.fiscal_number),
    address = COALESCE(NULLIF(EXCLUDED.address, ''), public.profiles.address),
    phone_number = COALESCE(NULLIF(EXCLUDED.phone_number, ''), public.profiles.phone_number),
    business_type = COALESCE(NULLIF(EXCLUDED.business_type, ''), public.profiles.business_type),
    user_role = COALESCE(NULLIF(EXCLUDED.user_role, ''), public.profiles.user_role);

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Funksion RPC i sigurt për marrjen e emailit me numër fiskal (lejon kyçjen pa pengesa RLS)
CREATE OR REPLACE FUNCTION public.get_email_by_fiscal(p_fiscal text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email
  FROM public.profiles
  WHERE lower(trim(fiscal_number)) = lower(trim(p_fiscal))
  LIMIT 1;

  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_fiscal(text) TO anon, authenticated;

-- 6. Politikat e sigurisë (RLS) për profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for fiscal lookup" ON public.profiles;
CREATE POLICY "Allow public read for fiscal lookup"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 7. Heqja e kufizimit të vjetër në tabelën workers nëse ekziston
ALTER TABLE public.workers DROP CONSTRAINT IF EXISTS workers_role_check;
