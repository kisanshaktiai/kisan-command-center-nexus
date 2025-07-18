
-- Enhanced user profiles with email verification tracking
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS 
  email_verified_at TIMESTAMP WITH TIME ZONE,
  email_verification_token TEXT,
  password_changed_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMP WITH TIME ZONE;

-- Create comprehensive user profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  organization_name TEXT,
  organization_type TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  email_verified_at TIMESTAMP WITH TIME ZONE,
  email_verification_token TEXT,
  password_changed_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMP WITH TIME ZONE,
  user_preferences JSONB DEFAULT '{}',
  user_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email verification tracking
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  token TEXT NOT NULL,
  verification_type TEXT DEFAULT 'signup',
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Session tracking for concurrent session limits
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  device_info JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Password reset requests tracking
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  token TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User tenant associations (if not exists)
CREATE TABLE IF NOT EXISTS public.user_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, tenant_id)
);

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for email_verifications
CREATE POLICY "Users can view their email verifications" ON public.email_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage email verifications" ON public.email_verifications
  FOR ALL USING (true);

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user sessions" ON public.user_sessions
  FOR ALL USING (true);

-- RLS Policies for password_reset_requests
CREATE POLICY "Users can view their password reset requests" ON public.password_reset_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage password reset requests" ON public.password_reset_requests
  FOR ALL USING (true);

-- RLS Policies for user_tenants
CREATE POLICY "Users can view their tenant associations" ON public.user_tenants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Tenant admins can manage user associations" ON public.user_tenants
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON public.user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    full_name, 
    phone, 
    organization_name, 
    organization_type,
    user_metadata
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'organization_name',
    new.raw_user_meta_data->>'organization_type',
    COALESCE(new.raw_user_meta_data, '{}')
  );
  RETURN new;
END;
$$ language 'plpgsql' security definer;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to track user login
CREATE OR REPLACE FUNCTION public.track_user_login(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_profiles 
  SET 
    last_login_at = now(),
    login_count = COALESCE(login_count, 0) + 1,
    failed_login_attempts = 0
  WHERE id = user_id;
END;
$$ language 'plpgsql' security definer;

-- Function to track failed login attempts
CREATE OR REPLACE FUNCTION public.track_failed_login(user_email TEXT)
RETURNS void AS $$
DECLARE
  user_id UUID;
  attempts INTEGER;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  
  IF user_id IS NOT NULL THEN
    UPDATE public.user_profiles 
    SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1
    WHERE id = user_id
    RETURNING failed_login_attempts INTO attempts;
    
    -- Lock account after 5 failed attempts for 30 minutes
    IF attempts >= 5 THEN
      UPDATE public.user_profiles 
      SET account_locked_until = now() + interval '30 minutes'
      WHERE id = user_id;
    END IF;
  END IF;
END;
$$ language 'plpgsql' security definer;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(user_email TEXT)
RETURNS boolean AS $$
DECLARE
  locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT account_locked_until INTO locked_until
  FROM public.user_profiles up
  JOIN auth.users u ON u.id = up.id
  WHERE u.email = user_email;
  
  RETURN locked_until IS NOT NULL AND locked_until > now();
END;
$$ language 'plpgsql' security definer;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON public.email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON public.email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id ON public.password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_token ON public.password_reset_requests(token);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON public.user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON public.user_tenants(tenant_id);
