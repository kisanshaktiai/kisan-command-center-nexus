
-- COMPREHENSIVE FIX FOR INFINITE RECURSION IN admin_users RLS POLICIES
-- This will permanently resolve the circular dependency issues

-- Step 1: Drop ALL existing problematic policies that cause recursion
DROP POLICY IF EXISTS "Admin access policy" ON admin_users;
DROP POLICY IF EXISTS "Self insert policy" ON admin_users;
DROP POLICY IF EXISTS "Self view policy" ON admin_users;
DROP POLICY IF EXISTS "super_admin_bypass" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON admin_users;
DROP POLICY IF EXISTS "Authenticated users can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can manage admin users via function" ON admin_users;

-- Step 2: Drop the problematic security definer function that causes recursion
DROP FUNCTION IF EXISTS public.check_admin_status();
DROP FUNCTION IF EXISTS public.is_admin_user();
DROP FUNCTION IF EXISTS public.is_current_user_admin();

-- Step 3: Create a completely new, non-recursive security definer function
-- This function uses a direct query without any RLS interference
CREATE OR REPLACE FUNCTION public.is_authenticated_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Direct query to admin_users bypassing RLS completely
    -- We use SECURITY DEFINER to run with elevated privileges
    SELECT role INTO user_role 
    FROM admin_users 
    WHERE id = auth.uid() 
    AND is_active = true
    LIMIT 1;
    
    -- Return true if user has admin privileges
    RETURN user_role IN ('super_admin', 'platform_admin', 'admin');
EXCEPTION
    WHEN OTHERS THEN
        -- Return false on any error to fail safely
        RETURN FALSE;
END;
$$;

-- Step 4: Create a function to check if user can insert themselves
CREATE OR REPLACE FUNCTION public.can_self_insert()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- Allow authenticated users to insert themselves
    RETURN auth.uid() IS NOT NULL;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Step 5: Create simple, non-recursive RLS policies using the new functions
-- Policy for admins to manage all admin records
CREATE POLICY "Admins can manage all admin users"
ON admin_users
FOR ALL
TO authenticated
USING (public.is_authenticated_admin())
WITH CHECK (public.is_authenticated_admin());

-- Policy for self-insertion (initial admin setup)
CREATE POLICY "Users can insert themselves as admin"
ON admin_users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid() AND public.can_self_insert());

-- Policy for viewing own record
CREATE POLICY "Users can view own admin record"
ON admin_users
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_authenticated_admin());

-- Step 6: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_authenticated_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_self_insert() TO authenticated;

-- Step 7: Ensure tenants table has proper admin access
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON tenants;
DROP POLICY IF EXISTS "Admin users can create and manage tenants" ON tenants;
DROP POLICY IF EXISTS "super_admin_bypass" ON tenants;

CREATE POLICY "Admin users can manage all tenants"
ON tenants
FOR ALL
TO authenticated
USING (public.is_authenticated_admin())
WITH CHECK (public.is_authenticated_admin());

-- Step 8: Fix tenant_branding and tenant_features tables
DROP POLICY IF EXISTS "super_admin_bypass" ON tenant_branding;
CREATE POLICY "Admin users can manage tenant branding"
ON tenant_branding
FOR ALL
TO authenticated
USING (public.is_authenticated_admin())
WITH CHECK (public.is_authenticated_admin());

DROP POLICY IF EXISTS "super_admin_bypass" ON tenant_features;
CREATE POLICY "Admin users can manage tenant features"
ON tenant_features
FOR ALL
TO authenticated
USING (public.is_authenticated_admin())
WITH CHECK (public.is_authenticated_admin());

-- Step 9: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_id_active ON admin_users(id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_users_role_active ON admin_users(role, is_active) WHERE is_active = true;

-- Step 10: Insert a default super admin if none exists (for testing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM admin_users 
        WHERE email = 'kisanshaktiai@gmail.com' 
        AND role = 'super_admin'
    ) THEN
        INSERT INTO admin_users (email, full_name, role, is_active)
        VALUES ('kisanshaktiai@gmail.com', 'Super Admin', 'super_admin', true)
        ON CONFLICT (email) DO UPDATE SET
            role = 'super_admin',
            is_active = true,
            updated_at = now();
    END IF;
END $$;
