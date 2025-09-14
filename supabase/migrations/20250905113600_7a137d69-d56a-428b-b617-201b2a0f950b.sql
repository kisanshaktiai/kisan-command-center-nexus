-- Fix authentication validation for edge functions by granting necessary permissions
-- Create an update for the onboarding_steps table to handle the "review-and-go-live" step properly
UPDATE public.onboarding_steps 
SET 
  step_status = 'completed',
  completed_at = NOW(),
  updated_at = NOW()
WHERE tenant_id IN (
  SELECT id FROM public.tenants WHERE status = 'active' AND onboarding_completed = true
) AND step_name = 'review-and-go-live';

-- Ensure the user_invitations table can be accessed properly by authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_invitations TO authenticated;