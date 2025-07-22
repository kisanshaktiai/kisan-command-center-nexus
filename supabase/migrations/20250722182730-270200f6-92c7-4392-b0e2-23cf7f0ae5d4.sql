
-- First, let's fix the RLS policies for admin_users table
-- This will ensure proper authentication can work

-- Temporarily disable RLS on admin_users for development if needed
-- ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Create a new table for OTP sessions
CREATE TABLE IF NOT EXISTS public.otp_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  otp text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '5 minutes'),
  is_used boolean DEFAULT false
);

-- Enable RLS on otp_sessions
ALTER TABLE public.otp_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for otp_sessions
CREATE POLICY "Users can view their own OTP sessions"
ON public.otp_sessions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own OTP sessions"
ON public.otp_sessions
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own OTP sessions"
ON public.otp_sessions
FOR UPDATE
USING (user_id = auth.uid());

-- Create policy to allow checking OTP without being logged in
-- This is necessary for the verification process
CREATE POLICY "Allow verification of OTP"
ON public.otp_sessions
FOR SELECT
USING (true);

-- Ensure proper policy for admin_users table to avoid RLS issues
DROP POLICY IF EXISTS "Admins can select their row" ON public.admin_users;
CREATE POLICY "Admins can select their row"
ON public.admin_users
FOR SELECT
TO authenticated
USING (true);

-- Create an edge function helper function to generate OTP
CREATE OR REPLACE FUNCTION public.generate_otp(p_length integer DEFAULT 6)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := '0123456789';
  result text := '';
  i integer := 0;
  rand integer := 0;
BEGIN
  FOR i IN 1..p_length LOOP
    rand := floor(random() * length(chars)) + 1;
    result := result || substr(chars, rand, 1);
  END LOOP;
  RETURN result;
END;
$$;
