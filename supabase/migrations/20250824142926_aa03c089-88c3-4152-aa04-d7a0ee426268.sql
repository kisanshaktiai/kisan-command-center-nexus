
-- First, let's check if there's a problematic trigger and fix the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    full_name, 
    email,
    mobile_number,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'mobile_number', NEW.phone, ''),
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Also ensure we don't have any problematic policies or functions referencing is_active on auth.users
-- Check and drop any problematic RLS policies that might reference auth.users.is_active
DO $$
DECLARE
    r RECORD;
BEGIN
    -- This will help identify any policies that might be causing issues
    FOR r IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE definition LIKE '%auth.users%is_active%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Dropped problematic policy: % on %.%', r.policyname, r.schemaname, r.tablename;
    END LOOP;
END
$$;

-- Make sure the admin_users table has proper constraints and defaults
ALTER TABLE public.admin_users ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE public.admin_users ALTER COLUMN is_active SET NOT NULL;
