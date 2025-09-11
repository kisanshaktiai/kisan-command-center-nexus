-- Update the get_mobile_white_label_config function to include brand_identity with tagline
CREATE OR REPLACE FUNCTION public.get_mobile_white_label_config(p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  config_data jsonb;
  brand_data jsonb;
BEGIN
  SELECT 
    jsonb_build_object(
      'tenant_id', tenant_id,
      'brand_identity', CASE 
        WHEN brand_identity ? 'tag_line' THEN 
          (brand_identity - 'tag_line') || jsonb_build_object('tagline', brand_identity->>'tag_line')
        ELSE 
          brand_identity
      END,
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
      'brand_identity', jsonb_build_object(
        'primary_color', '#6366f1',
        'secondary_color', '#a855f7',
        'accent_color', '#f59e0b',
        'font_family', 'Inter',
        'company_name', '',
        'app_name', '',
        'tagline', ''
      ),
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
$function$;