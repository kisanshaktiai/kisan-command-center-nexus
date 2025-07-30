
-- Update the check_slug_availability function to support editing by excluding current tenant
CREATE OR REPLACE FUNCTION public.check_slug_availability(p_slug text, p_tenant_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Validate slug format (lowercase, alphanumeric with hyphens only)
  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Slug cannot be empty',
      'code', 'EMPTY_SLUG'
    );
  END IF;
  
  -- Check slug format
  IF p_slug !~ '^[a-z0-9-]+$' THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Slug must contain only lowercase letters, numbers, and hyphens',
      'code', 'INVALID_FORMAT'
    );
  END IF;
  
  -- Check if slug starts or ends with hyphen
  IF p_slug ~ '^-' OR p_slug ~ '-$' THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Slug cannot start or end with a hyphen',
      'code', 'INVALID_FORMAT'
    );
  END IF;
  
  -- Check for consecutive hyphens
  IF p_slug ~ '--' THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Slug cannot contain consecutive hyphens',
      'code', 'INVALID_FORMAT'
    );
  END IF;
  
  -- Check minimum and maximum length
  IF length(p_slug) < 3 THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Slug must be at least 3 characters long',
      'code', 'TOO_SHORT'
    );
  END IF;
  
  IF length(p_slug) > 50 THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Slug must be no more than 50 characters long',
      'code', 'TOO_LONG'
    );
  END IF;
  
  -- Check if slug already exists (excluding current tenant if editing)
  IF EXISTS (
    SELECT 1 FROM public.tenants 
    WHERE slug = p_slug 
    AND (p_tenant_id IS NULL OR id != p_tenant_id)
  ) THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'This slug is already taken',
      'code', 'ALREADY_EXISTS'
    );
  END IF;
  
  -- Check against reserved slugs
  IF p_slug = ANY(ARRAY['api', 'www', 'admin', 'app', 'dashboard', 'mail', 'ftp', 'localhost', 'support', 'help', 'docs', 'blog', 'status', 'dev', 'staging', 'test', 'demo']) THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'This slug is reserved and cannot be used',
      'code', 'RESERVED_SLUG'
    );
  END IF;
  
  -- Slug is available
  RETURN jsonb_build_object(
    'available', true,
    'message', 'Slug is available',
    'code', 'AVAILABLE'
  );
END;
$function$
