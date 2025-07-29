-- Fix bootstrap state and ensure system is properly initialized
-- Update system_config to mark bootstrap as completed
INSERT INTO public.system_config (config_key, config_value, created_at, updated_at)
VALUES ('bootstrap_completed', 'true', now(), now())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = 'true',
  updated_at = now();

-- Ensure we have proper invite-only admin registration flow
-- Update admin_invites table structure if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_invites' AND column_name = 'invite_token') THEN
    ALTER TABLE admin_invites ADD COLUMN invite_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'base64url');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_invites' AND column_name = 'metadata') THEN
    ALTER TABLE admin_invites ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;
END
$$;

-- Create index on invite_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_invites_token ON admin_invites (invite_token);
CREATE INDEX IF NOT EXISTS idx_admin_invites_email_status ON admin_invites (email, status);

-- Ensure proper RLS policies for admin invites
DROP POLICY IF EXISTS "Public can read invites by token" ON admin_invites;
CREATE POLICY "Public can read invites by token" 
ON admin_invites FOR SELECT 
USING (true);

-- Create secure registration workflow table if not exists
CREATE TABLE IF NOT EXISTS admin_registration_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_id uuid REFERENCES admin_invites(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  used_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS on registration tokens
ALTER TABLE admin_registration_tokens ENABLE ROW LEVEL SECURITY;

-- Allow public read access for token validation
CREATE POLICY "Public can validate registration tokens" 
ON admin_registration_tokens FOR SELECT 
USING (expires_at > now() AND used_at IS NULL);

-- Only system can insert/update tokens
CREATE POLICY "System can manage registration tokens" 
ON admin_registration_tokens FOR ALL 
USING (false)
WITH CHECK (false);

-- Create function to validate and consume registration tokens
CREATE OR REPLACE FUNCTION public.validate_admin_registration_token(p_token text)
RETURNS TABLE(
  valid boolean,
  email text,
  role text,
  invite_id uuid,
  expires_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_record admin_registration_tokens%ROWTYPE;
BEGIN
  -- Get the token record
  SELECT * INTO token_record
  FROM admin_registration_tokens
  WHERE token = p_token
    AND expires_at > now()
    AND used_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, null::text, null::text, null::uuid, null::timestamp with time zone;
    RETURN;
  END IF;
  
  -- Return valid token details
  RETURN QUERY SELECT 
    true,
    token_record.email,
    token_record.role,
    token_record.invite_id,
    token_record.expires_at;
END;
$$;