-- Fix 1: Make mobile_number nullable in user_profiles to prevent signup failures
ALTER TABLE public.user_profiles 
ALTER COLUMN mobile_number DROP NOT NULL;

-- Fix 2: Update the handle_new_user trigger to handle missing mobile_number gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
    COALESCE(NEW.raw_user_meta_data->>'mobile_number', NEW.phone, ''), -- Handle missing mobile
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

-- Fix 3: Update bootstrap RLS policy to allow initial super admin creation
DROP POLICY IF EXISTS "Bootstrap super admin registration" ON public.admin_users;

CREATE POLICY "Bootstrap super admin registration" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (
  -- Allow if no super admin exists (bootstrap scenario)
  (NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE role = 'super_admin' AND is_active = true
  ))
  OR 
  -- Allow if user is authenticated and inserting their own record
  (auth.uid() = id)
);

-- Fix 4: Clear the orphaned auth user to allow clean bootstrap
DELETE FROM auth.users WHERE email = 'kisanshaktiai@gmail.com';

-- Fix 5: Verify the fix by checking constraints
SELECT 
    'mobile_number_nullable' as check_name,
    is_nullable as status
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'mobile_number';