-- Update white_label_configs table to add missing columns
ALTER TABLE public.white_label_configs 
ADD COLUMN IF NOT EXISTS css_injection jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS app_customization jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS content_management jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS distribution jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS domain_health jsonb DEFAULT '{}'::jsonb;

-- Create index for faster tenant lookup
CREATE INDEX IF NOT EXISTS idx_white_label_configs_tenant_id 
ON public.white_label_configs(tenant_id);

-- Add RLS policies if they don't exist
ALTER TABLE public.white_label_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can manage white label configs" ON public.white_label_configs;
DROP POLICY IF EXISTS "Tenant admins can view their white label config" ON public.white_label_configs;

-- Create new policies
CREATE POLICY "Super admins can manage white label configs" 
ON public.white_label_configs 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  )
);

CREATE POLICY "Tenant admins can view their white label config" 
ON public.white_label_configs 
FOR SELECT 
TO authenticated 
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenants 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('tenant_owner', 'tenant_admin')
  )
);

-- Update existing records to have default values for new columns
UPDATE public.white_label_configs 
SET 
  css_injection = COALESCE(css_injection, '{}'::jsonb),
  app_customization = COALESCE(app_customization, '{}'::jsonb),
  content_management = COALESCE(content_management, '{}'::jsonb),
  distribution = COALESCE(distribution, '{}'::jsonb),
  domain_health = COALESCE(domain_health, '{}'::jsonb)
WHERE css_injection IS NULL 
   OR app_customization IS NULL 
   OR content_management IS NULL 
   OR distribution IS NULL
   OR domain_health IS NULL;