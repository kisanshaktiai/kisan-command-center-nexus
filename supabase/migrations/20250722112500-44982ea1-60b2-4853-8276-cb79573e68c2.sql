
-- Function to promote a user to super admin (for future use)
CREATE OR REPLACE FUNCTION auth.promote_user_to_super_admin(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user metadata to include super_admin role
  UPDATE auth.users 
  SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'super_admin'),
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'super_admin')
  WHERE email = user_email;
  
  RETURN FOUND;
END;
$$;

-- Note: To promote a specific user, call the function manually:
-- SELECT auth.promote_user_to_super_admin('your-email@domain.com');
