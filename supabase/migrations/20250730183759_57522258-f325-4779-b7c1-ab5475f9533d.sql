
-- Fix the generate_invite_token function to use standard base64 encoding
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Use standard base64 encoding instead of base64url
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$function$
