
-- Check current user metadata for debugging
SELECT id, email, raw_user_meta_data, raw_app_meta_data 
FROM auth.users 
WHERE email = 'kisanshaktiai@gmail.com';

-- Update the specific user with super_admin role in user_metadata
UPDATE auth.users 
SET raw_user_meta_data = jsonb_build_object(
  'role', 'super_admin',
  'full_name', 'Super Admin',
  'email_verified', COALESCE(raw_user_meta_data->>'email_verified', 'true')::boolean
)
WHERE email = 'kisanshaktiai@gmail.com';

-- Also set in app_metadata as a backup
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'super_admin',
  'provider', COALESCE(raw_app_meta_data->>'provider', 'email'),
  'providers', COALESCE(raw_app_meta_data->'providers', '["email"]'::jsonb)
)
WHERE email = 'kisanshaktiai@gmail.com';

-- Create a function to promote a user to super admin (for future use)
CREATE OR REPLACE FUNCTION auth.promote_user_to_super_admin(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users 
  SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'super_admin'),
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'super_admin')
  WHERE email = user_email;
  
  RETURN FOUND;
END;
$$;

-- Verify the update worked
SELECT id, email, raw_user_meta_data->>'role' as user_role, raw_app_meta_data->>'role' as app_role
FROM auth.users 
WHERE email = 'kisanshaktiai@gmail.com';
