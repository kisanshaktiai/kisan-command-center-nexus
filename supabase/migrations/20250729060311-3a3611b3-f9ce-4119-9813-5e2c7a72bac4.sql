-- Fix security issue: Enable RLS on tables that don't have it
-- First, let's check which tables need RLS by enabling it on key system tables

-- Fix search path issues for the new functions
DROP FUNCTION IF EXISTS public.is_invite_valid(TEXT);
DROP FUNCTION IF EXISTS public.mark_invite_used(TEXT);

-- Recreate functions with proper search path
CREATE OR REPLACE FUNCTION public.is_invite_valid(invite_token TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invites
    WHERE token = invite_token
    AND expires_at > now()
    AND used_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.mark_invite_used(invite_token TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.invites
  SET used_at = now()
  WHERE token = invite_token
  AND expires_at > now()
  AND used_at IS NULL
  RETURNING true;
$$;