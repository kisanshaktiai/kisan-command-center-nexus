-- Create admin invites table for secure invite management
CREATE TABLE IF NOT EXISTS public.admin_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'platform_admin', 'super_admin')),
  invite_token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT unique_pending_email UNIQUE (email) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Enable RLS
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super admins can manage all invites"
  ON public.admin_invites
  FOR ALL
  USING (is_current_user_super_admin())
  WITH CHECK (is_current_user_super_admin());

CREATE POLICY "Platform admins can manage admin invites"
  ON public.admin_invites
  FOR ALL
  USING (
    get_current_admin_role() = 'platform_admin' 
    AND role NOT IN ('super_admin', 'platform_admin')
  )
  WITH CHECK (
    get_current_admin_role() = 'platform_admin' 
    AND role NOT IN ('super_admin', 'platform_admin')
  );

CREATE POLICY "Public can read invites by token"
  ON public.admin_invites
  FOR SELECT
  USING (true);

-- Create invite analytics table
CREATE TABLE IF NOT EXISTS public.admin_invite_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_id UUID NOT NULL REFERENCES admin_invites(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'opened', 'accepted', 'expired', 'resent')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.admin_invite_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Admins can view invite analytics"
  ON public.admin_invite_analytics
  FOR SELECT
  USING (is_authenticated_admin());

-- Create function to generate secure invite tokens
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate invite tokens
CREATE OR REPLACE FUNCTION validate_invite_token(token TEXT)
RETURNS TABLE(
  invite_id UUID,
  email TEXT,
  role TEXT,
  is_valid BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id,
    ai.email,
    ai.role,
    (ai.status = 'pending' AND ai.expires_at > now()) as is_valid,
    ai.expires_at
  FROM admin_invites ai
  WHERE ai.invite_token = token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to expire old invites
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE admin_invites 
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER update_admin_invites_updated_at
  BEFORE UPDATE ON admin_invites
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_admin_invites_token ON admin_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_admin_invites_email_status ON admin_invites(email, status);
CREATE INDEX IF NOT EXISTS idx_admin_invites_expires_at ON admin_invites(expires_at) WHERE status = 'pending';