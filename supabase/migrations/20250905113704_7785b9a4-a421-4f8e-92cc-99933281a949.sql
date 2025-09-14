-- Fix authentication issues and permissions
-- Grant necessary permissions to authenticated users for user_invitations table
GRANT SELECT, INSERT, UPDATE ON public.user_invitations TO authenticated;
GRANT SELECT ON public.user_tenants TO authenticated;

-- Update the onboarding_steps table to handle the "review-and-go-live" step properly
-- Fix the column reference by using workflow_id
UPDATE public.onboarding_steps 
SET 
  step_status = 'completed',
  completed_at = NOW(),
  updated_at = NOW()
WHERE workflow_id IN (
  SELECT ow.id 
  FROM public.onboarding_workflows ow
  JOIN public.tenants t ON ow.tenant_id = t.id
  WHERE t.status = 'active' AND t.onboarding_completed = true
) AND step_name = 'review-and-go-live';

-- Add index for better performance on user_invitations lookups
CREATE INDEX IF NOT EXISTS idx_user_invitations_tenant_email 
ON public.user_invitations(tenant_id, email);