-- Add ai_enabled column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ai_enabled boolean DEFAULT true;

-- Update RLS for profiles to allow admins to update other profiles
-- First, check if the policy exists or just create a new one for admins
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Admins can update all profiles'
    ) THEN
        CREATE POLICY "Admins can update all profiles" 
        ON public.profiles 
        FOR UPDATE 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END $$;
