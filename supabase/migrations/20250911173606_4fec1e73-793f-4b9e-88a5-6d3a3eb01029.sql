-- Enhance white_label_configs table with modern 2025 UI theme structure
-- Add comprehensive mobile theme configuration

-- First, update the existing white_label_configs table to add new theme structure
ALTER TABLE public.white_label_configs
ADD COLUMN IF NOT EXISTS mobile_theme jsonb DEFAULT '{
  "core": {
    "primary": "210 100% 50%",
    "primary_variant": "210 100% 40%",
    "secondary": "160 60% 45%",
    "secondary_variant": "160 60% 35%",
    "tertiary": "280 60% 50%",
    "accent": "45 90% 50%"
  },
  "neutral": {
    "background": "0 0% 98%",
    "surface": "0 0% 100%",
    "on_background": "0 0% 10%",
    "on_surface": "0 0% 15%",
    "border": "0 0% 90%"
  },
  "status": {
    "success": "142 71% 45%",
    "warning": "38 92% 50%",
    "error": "0 84% 60%",
    "info": "199 89% 48%"
  },
  "support": {
    "disabled": "0 0% 60%",
    "overlay": "0 0% 0%"
  },
  "typography": {
    "font_family": "Inter",
    "font_size_base": 16,
    "font_weight_regular": 400,
    "font_weight_medium": 500,
    "font_weight_bold": 700
  },
  "spacing": {
    "unit": 4,
    "xs": 4,
    "sm": 8,
    "md": 16,
    "lg": 24,
    "xl": 32
  },
  "border_radius": {
    "sm": 4,
    "md": 8,
    "lg": 12,
    "full": 9999
  },
  "shadows": {
    "sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    "xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
  }
}'::jsonb,
ADD COLUMN IF NOT EXISTS api_version text DEFAULT 'v1',
ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS validation_errors jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_validated boolean DEFAULT false;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_white_label_configs_tenant_id ON public.white_label_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_white_label_configs_api_version ON public.white_label_configs(api_version);

-- Create or replace function to validate white label config
CREATE OR REPLACE FUNCTION validate_white_label_config(config_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validation_errors jsonb := '[]'::jsonb;
  required_fields text[] := ARRAY['mobile_theme', 'app_customization'];
  field text;
BEGIN
  -- Check required fields
  FOREACH field IN ARRAY required_fields LOOP
    IF config_data->field IS NULL THEN
      validation_errors := validation_errors || jsonb_build_object(
        'field', field,
        'error', 'Required field is missing'
      );
    END IF;
  END LOOP;
  
  -- Validate color formats (should be HSL)
  -- Add more validation as needed
  
  RETURN jsonb_build_object(
    'is_valid', jsonb_array_length(validation_errors) = 0,
    'errors', validation_errors
  );
END;
$$;

-- Create function to get white label config for mobile apps
CREATE OR REPLACE FUNCTION get_mobile_white_label_config(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_data jsonb;
BEGIN
  SELECT 
    jsonb_build_object(
      'tenant_id', tenant_id,
      'mobile_theme', COALESCE(mobile_theme, '{}'::jsonb),
      'app_customization', COALESCE(app_customization, '{}'::jsonb),
      'content_management', COALESCE(content_management, '{}'::jsonb),
      'distribution_options', COALESCE(distribution_options, '{}'::jsonb),
      'api_version', api_version,
      'last_synced_at', last_synced_at
    )
  INTO config_data
  FROM public.white_label_configs
  WHERE tenant_id = p_tenant_id
  ORDER BY updated_at DESC
  LIMIT 1;
  
  IF config_data IS NULL THEN
    -- Return default config if none exists
    RETURN jsonb_build_object(
      'tenant_id', p_tenant_id,
      'mobile_theme', jsonb_build_object(
        'core', jsonb_build_object(
          'primary', '210 100% 50%',
          'primary_variant', '210 100% 40%',
          'secondary', '160 60% 45%',
          'secondary_variant', '160 60% 35%',
          'tertiary', '280 60% 50%',
          'accent', '45 90% 50%'
        ),
        'neutral', jsonb_build_object(
          'background', '0 0% 98%',
          'surface', '0 0% 100%',
          'on_background', '0 0% 10%',
          'on_surface', '0 0% 15%',
          'border', '0 0% 90%'
        ),
        'status', jsonb_build_object(
          'success', '142 71% 45%',
          'warning', '38 92% 50%',
          'error', '0 84% 60%',
          'info', '199 89% 48%'
        ),
        'support', jsonb_build_object(
          'disabled', '0 0% 60%',
          'overlay', '0 0% 0%'
        )
      ),
      'app_customization', '{}'::jsonb,
      'content_management', '{}'::jsonb,
      'distribution_options', '{}'::jsonb,
      'api_version', 'v1',
      'is_default', true
    );
  END IF;
  
  RETURN config_data;
END;
$$;

-- Update RLS policies for white_label_configs to be more permissive for mobile access
-- Drop existing policies first
DROP POLICY IF EXISTS "Super admins can manage all white label configs" ON public.white_label_configs;
DROP POLICY IF EXISTS "Tenant admins can manage their white label configs" ON public.white_label_configs;
DROP POLICY IF EXISTS "Tenant users can view their white label configs" ON public.white_label_configs;
DROP POLICY IF EXISTS "Public can read white label configs by tenant" ON public.white_label_configs;

-- Create new comprehensive policies
-- Super admins have full access
CREATE POLICY "Super admins full access to white label configs"
ON public.white_label_configs
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

-- Tenant admins can manage their configs
CREATE POLICY "Tenant admins manage their configs"
ON public.white_label_configs
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenants
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role IN ('tenant_admin', 'tenant_owner')
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenants
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role IN ('tenant_admin', 'tenant_owner')
  )
);

-- Tenant users can view their configs
CREATE POLICY "Tenant users view their configs"
ON public.white_label_configs
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenants
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- Public/anonymous access for mobile apps (read-only by tenant_id)
CREATE POLICY "Public read access by tenant"
ON public.white_label_configs
FOR SELECT
TO anon
USING (true); -- Mobile apps will filter by tenant_id in queries

-- Enable realtime for white_label_configs
ALTER PUBLICATION supabase_realtime ADD TABLE public.white_label_configs;