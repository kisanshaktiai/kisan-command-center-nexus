
-- Drop the conflicting text version of advance_onboarding_step function
-- This will resolve the "Could not choose the best candidate function" error
DROP FUNCTION IF EXISTS public.advance_onboarding_step(p_step_id uuid, p_new_status text, p_step_data jsonb);

-- Verify the enum version still exists and works correctly
-- The remaining function should be:
-- public.advance_onboarding_step(p_step_id uuid, p_new_status onboarding_step_status, p_step_data jsonb)
