
-- Drop existing user_invitations table
DROP TABLE IF EXISTS public.user_invitations CASCADE;

-- Create new team_invitations table with enhanced role management
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'tenant_user',
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'accepted', 'expired', 'cancelled')),
  invited_by UUID NOT NULL,
  inviter_name TEXT,
  tenant_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  sent_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_team_invitations_tenant_id ON public.team_invitations(tenant_id);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(invitation_token);
CREATE INDEX idx_team_invitations_status ON public.team_invitations(status);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant admins can manage team invitations" ON public.team_invitations
  FOR ALL
  USING (
    tenant_id IN (
      SELECT user_tenants.tenant_id
      FROM user_tenants
      WHERE user_tenants.user_id = auth.uid()
        AND user_tenants.is_active = true
        AND user_tenants.role IN ('tenant_owner', 'tenant_admin')
    )
  );

CREATE POLICY "Users can view invitations sent to their email" ON public.team_invitations
  FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_team_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_team_invitations_updated_at();

-- Create function to validate invitation tokens
CREATE OR REPLACE FUNCTION public.validate_team_invitation_token(token text)
RETURNS TABLE(
  invitation_id uuid,
  tenant_id uuid,
  email text,
  first_name text,
  last_name text,
  role text,
  is_valid boolean,
  expires_at timestamp with time zone,
  tenant_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.id,
    ti.tenant_id,
    ti.email,
    ti.first_name,
    ti.last_name,
    ti.role,
    (ti.status IN ('sent', 'clicked') AND ti.expires_at > now()) as is_valid,
    ti.expires_at,
    ti.tenant_name
  FROM public.team_invitations ti
  WHERE ti.invitation_token = token;
END;
$$;

-- Create function to mark invitation as clicked
CREATE OR REPLACE FUNCTION public.mark_team_invitation_clicked(token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.team_invitations
  SET 
    status = 'clicked',
    clicked_at = now(),
    updated_at = now()
  WHERE invitation_token = token
    AND status = 'sent'
    AND expires_at > now();
    
  RETURN FOUND;
END;
$$;

-- Create function to mark invitation as accepted
CREATE OR REPLACE FUNCTION public.mark_team_invitation_accepted(token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.team_invitations
  SET 
    status = 'accepted',
    accepted_at = now(),
    updated_at = now()
  WHERE invitation_token = token
    AND status IN ('sent', 'clicked')
    AND expires_at > now();
    
  RETURN FOUND;
END;
$$;
