-- Enable RLS on tables that currently have it disabled

-- 1. Enable RLS on farming_stages table
ALTER TABLE public.farming_stages ENABLE ROW LEVEL SECURITY;

-- Create policies for farming_stages (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view farming stages" 
ON public.farming_stages 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Super admins can manage farming stages
CREATE POLICY "Super admins can manage farming stages" 
ON public.farming_stages 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
);

-- 2. Enable RLS on user_invitations table
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all invitations
CREATE POLICY "Super admins can manage all invitations" 
ON public.user_invitations 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
);

-- Platform admins can view all invitations
CREATE POLICY "Platform admins can view invitations" 
ON public.user_invitations 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'platform_admin') 
    AND is_active = true
  )
);

-- Tenant admins can manage their tenant's invitations
CREATE POLICY "Tenant admins can manage their invitations" 
ON public.user_invitations 
FOR ALL 
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM public.user_tenants 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('tenant_admin', 'tenant_owner')
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id 
    FROM public.user_tenants 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('tenant_admin', 'tenant_owner')
  )
);

-- Users who created invitations can view them
CREATE POLICY "Users can view invitations they created" 
ON public.user_invitations 
FOR SELECT 
TO authenticated
USING (created_by = auth.uid() OR invited_by = auth.uid());

-- Public can validate invitation tokens (for invitation acceptance flow)
CREATE POLICY "Public can validate invitation by token" 
ON public.user_invitations 
FOR SELECT 
TO anon
USING (
  invitation_token IS NOT NULL 
  AND status IN ('sent', 'clicked')
  AND expires_at > now()
);

-- Service role can update invitation status
CREATE POLICY "Service role can update invitations" 
ON public.user_invitations 
FOR UPDATE 
TO service_role
USING (true)
WITH CHECK (true);

-- Note: spatial_ref_sys is a PostGIS system table and should not have RLS enabled
-- It's used for spatial reference systems and needs to be publicly readable