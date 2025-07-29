-- Phase 1: Create unified authentication system tables only

-- First, create admin registrations table
CREATE TABLE IF NOT EXISTS public.admin_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  registration_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
  registration_type TEXT NOT NULL DEFAULT 'invite', -- 'invite', 'bootstrap', 'self'
  invited_by UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'expired', 'rejected'
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create onboarding workflows table
CREATE TABLE IF NOT EXISTS public.onboarding_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID,
  user_id UUID,
  workflow_type TEXT NOT NULL, -- 'bootstrap', 'admin_invite', 'tenant_setup'
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER NOT NULL,
  steps_data JSONB DEFAULT '[]',
  progress_percentage INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create system configuration table
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert initial system configuration
INSERT INTO public.system_config (config_key, config_value, description) VALUES
  ('bootstrap_completed', 'false', 'Whether the initial super admin bootstrap has been completed'),
  ('allow_self_registration', 'false', 'Whether users can self-register as basic admins'),
  ('email_verification_required', 'false', 'Whether email verification is required for admin accounts'),
  ('session_timeout_minutes', '480', 'Session timeout in minutes (8 hours)'),
  ('max_failed_login_attempts', '5', 'Maximum failed login attempts before lockout')
ON CONFLICT (config_key) DO NOTHING;