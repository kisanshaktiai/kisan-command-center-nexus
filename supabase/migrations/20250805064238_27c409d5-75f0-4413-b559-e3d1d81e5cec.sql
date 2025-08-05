
-- Add 'admin' to the admin_role enum if it doesn't exist
DO $$ 
BEGIN
    -- Check if 'admin' value exists in admin_role enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'admin' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_role')
    ) THEN
        ALTER TYPE admin_role ADD VALUE 'admin';
    END IF;
END $$;

-- Ensure admin_users table role column uses admin_role enum consistently
-- First, let's check the current column type and fix if needed
DO $$
BEGIN
    -- Update any existing 'admin' text values to be compatible
    UPDATE admin_users 
    SET role = 'admin'::admin_role 
    WHERE role::text = 'admin' AND role::text NOT IN ('super_admin', 'platform_admin');
    
    -- If column is text type, convert it to admin_role enum
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'role' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE admin_users 
        ALTER COLUMN role TYPE admin_role USING role::admin_role;
    END IF;
END $$;

-- Update any admin_invites that might have invalid role values
UPDATE admin_invites 
SET role = 'admin'
WHERE role = 'admin' AND role NOT IN ('super_admin', 'platform_admin', 'admin');

-- Update any admin_registration_tokens that might have invalid role values  
UPDATE admin_registration_tokens
SET role = 'admin'
WHERE role = 'admin' AND role NOT IN ('super_admin', 'platform_admin', 'admin');

-- Update any admin_registrations that might have invalid role values
UPDATE admin_registrations
SET role = 'admin'
WHERE role = 'admin' AND role NOT IN ('super_admin', 'platform_admin', 'admin');

-- Add a check to ensure role consistency across admin tables
-- Update the admin_users default value to use the enum
ALTER TABLE admin_users ALTER COLUMN role SET DEFAULT 'admin'::admin_role;

-- Ensure admin_invites role column references valid admin_role values
ALTER TABLE admin_invites 
ADD CONSTRAINT check_admin_invites_role 
CHECK (role IN ('super_admin', 'platform_admin', 'admin'));

-- Ensure admin_registration_tokens role column references valid admin_role values  
ALTER TABLE admin_registration_tokens
ADD CONSTRAINT check_admin_registration_tokens_role
CHECK (role IN ('super_admin', 'platform_admin', 'admin'));

-- Ensure admin_registrations role column references valid admin_role values
ALTER TABLE admin_registrations
ADD CONSTRAINT check_admin_registrations_role  
CHECK (role IN ('super_admin', 'platform_admin', 'admin'));
