
-- First, let's make sure admin_users table has the correct structure
-- Check current admin_users table structure and ensure is_active exists
DO $$
BEGIN
    -- Ensure is_active column exists in admin_users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_users' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.admin_users ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
        RAISE NOTICE 'Added is_active column to admin_users table';
    END IF;
END
$$;

-- Remove any problematic triggers from auth.users table
-- The auth.users table should NOT have custom triggers that reference non-existent fields
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_auth_user_update_trigger ON auth.users;

-- Create a safe trigger function for auth.users that doesn't reference non-existent columns
CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
RETURNS TRIGGER AS $$
BEGIN
    -- This function should NOT reference any columns that don't exist in auth.users
    -- auth.users managed by Supabase has: id, email, created_at, updated_at, etc.
    -- It does NOT have: is_active, role, or other custom fields
    
    -- Simply return NEW without trying to access non-existent fields
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the correct user profile trigger that only uses fields that exist in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only use fields that actually exist in auth.users
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger properly
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Make sure all functions that check admin status use the correct table and fields
CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS TEXT AS $$
BEGIN
    -- Use admin_users table which HAS the is_active field
    RETURN (
        SELECT role FROM public.admin_users 
        WHERE id = auth.uid() 
        AND is_active = true  -- This field exists in admin_users
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Use admin_users table which HAS the is_active field
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE id = auth.uid() 
        AND role = 'super_admin' 
        AND is_active = true  -- This field exists in admin_users
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_authenticated_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Use admin_users table which HAS the is_active field
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE id = auth.uid() 
        AND is_active = true  -- This field exists in admin_users
        AND role IN ('super_admin', 'platform_admin', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix the get_super_admin_count function to use correct field
CREATE OR REPLACE FUNCTION public.get_super_admin_count()
RETURNS INTEGER AS $$
BEGIN
    -- Use admin_users table which HAS the is_active field
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM public.admin_users 
        WHERE role = 'super_admin' 
        AND is_active = true  -- This field exists in admin_users
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
