-- Create invites table for partner onboarding
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view invites by token for verification"
ON public.invites
FOR SELECT
USING (true);

CREATE POLICY "Admins can create invites"
ON public.invites
FOR INSERT
WITH CHECK (is_authenticated_admin());

CREATE POLICY "Admins can update invites"
ON public.invites
FOR UPDATE
USING (is_authenticated_admin());

-- Index for performance
CREATE INDEX idx_invites_token ON public.invites(token);
CREATE INDEX idx_invites_email ON public.invites(email);
CREATE INDEX idx_invites_expires_at ON public.invites(expires_at);

-- Function to check if invite is valid
CREATE OR REPLACE FUNCTION public.is_invite_valid(invite_token TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invites
    WHERE token = invite_token
    AND expires_at > now()
    AND used_at IS NULL
  );
$$;

-- Function to mark invite as used
CREATE OR REPLACE FUNCTION public.mark_invite_used(invite_token TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.invites
  SET used_at = now()
  WHERE token = invite_token
  AND expires_at > now()
  AND used_at IS NULL
  RETURNING true;
$$;