-- Add manager_pin and role defaults to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS manager_pin text DEFAULT '1234',
ADD COLUMN IF NOT EXISTS role text DEFAULT 'business_admin';

-- Create Workers / Staff table
CREATE TABLE IF NOT EXISTS public.workers (
  id serial PRIMARY KEY,
  business_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  username text NOT NULL,
  password_hash text NOT NULL, -- password set by business admin
  role text NOT NULL CHECK (role IN ('seller', 'commercialist', 'manager')),
  shift_start_time text, -- Optional (e.g. "08:00")
  shift_end_time text,   -- Optional (e.g. "16:00")
  work_days text,        -- Optional (e.g. "Hën - Prem")
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(business_id, username)
);

-- Create Worker Shifts table
CREATE TABLE IF NOT EXISTS public.worker_shifts (
  id serial PRIMARY KEY,
  worker_id integer REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  business_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  clock_in timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  clock_out timestamp with time zone,
  total_sales numeric(12, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add worker tracking and correction columns to Sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS worker_id integer,
ADD COLUMN IF NOT EXISTS worker_name text,
ADD COLUMN IF NOT EXISTS is_corrected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS corrected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS corrected_by text,
ADD COLUMN IF NOT EXISTS original_total_amount numeric(12, 2);

-- Add worker tracking to Purchases
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS worker_id integer,
ADD COLUMN IF NOT EXISTS worker_name text;

-- Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Workers
CREATE POLICY "Users can view own workers" ON public.workers 
  FOR SELECT USING (auth.uid() = business_id);

CREATE POLICY "Users can insert own workers" ON public.workers 
  FOR INSERT WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Users can update own workers" ON public.workers 
  FOR UPDATE USING (auth.uid() = business_id);

CREATE POLICY "Users can delete own workers" ON public.workers 
  FOR DELETE USING (auth.uid() = business_id);

-- RLS Policies for Worker Shifts
CREATE POLICY "Users can view own shifts" ON public.worker_shifts 
  FOR SELECT USING (auth.uid() = business_id);

CREATE POLICY "Users can insert own shifts" ON public.worker_shifts 
  FOR INSERT WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Users can update own shifts" ON public.worker_shifts 
  FOR UPDATE USING (auth.uid() = business_id);

-- RPC Function to Authenticate Worker securely
CREATE OR REPLACE FUNCTION public.verify_worker_login(
  p_username text,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_worker record;
  v_profile record;
BEGIN
  SELECT * INTO v_worker
  FROM public.workers
  WHERE (lower(username) = lower(trim(p_username)) 
     OR lower(first_name || ' ' || last_name) = lower(trim(p_username)))
    AND password_hash = trim(p_password)
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT email, business_name, fiscal_number INTO v_profile
  FROM public.profiles
  WHERE id = v_worker.business_id;

  RETURN json_build_object(
    'id', v_worker.id,
    'business_id', v_worker.business_id,
    'first_name', v_worker.first_name,
    'last_name', v_worker.last_name,
    'username', v_worker.username,
    'role', v_worker.role,
    'shift_start_time', v_worker.shift_start_time,
    'shift_end_time', v_worker.shift_end_time,
    'work_days', v_worker.work_days,
    'is_active', v_worker.is_active,
    'business_email', v_profile.email,
    'business_name', v_profile.business_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_worker_login(text, text) TO anon, authenticated;
