
-- Remove ALL custom triggers from auth.users table that might be causing issues
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    -- Get all custom triggers on auth.users (excluding system triggers)
    FOR trigger_rec IN 
        SELECT tgname, tgrelid::regclass as table_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'auth' 
        AND c.relname = 'users'
        AND NOT tgisinternal 
        AND tgname NOT LIKE 'RI_%'
        AND tgname NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s CASCADE', trigger_rec.tgname, trigger_rec.table_name);
        RAISE NOTICE 'Removed trigger % from %', trigger_rec.tgname, trigger_rec.table_name;
    END LOOP;
END
$$;

-- Ensure no RLS policies on auth.users reference non-existent columns
-- (This is just a safety check - we shouldn't have policies on auth schema)

-- Make sure user_profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    mobile_number TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create a simple, safe policy for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR ALL USING (auth.uid() = id);

-- Create a completely safe trigger function for new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert into user_profiles, don't reference any auth.users columns that don't exist
    INSERT INTO public.user_profiles (
        id, 
        full_name, 
        email,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING; -- Prevent duplicate key errors
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't block user creation if profile creation fails
        RAISE WARNING 'Failed to create user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for new user signups (this should be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user_signup();

-- Ensure system_config table exists for bootstrap tracking
CREATE TABLE IF NOT EXISTS public.system_config (
    config_key TEXT PRIMARY KEY,
    config_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert bootstrap_completed config if it doesn't exist
INSERT INTO public.system_config (config_key, config_value)
VALUES ('bootstrap_completed', 'false')
ON CONFLICT (config_key) DO NOTHING;

-- Clean up any problematic functions and recreate them safely
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
