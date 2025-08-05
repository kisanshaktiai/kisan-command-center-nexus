
-- Update the leads table to allow 'converted' status
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_status_check;

-- Add new check constraint that includes 'converted' status
ALTER TABLE public.leads 
ADD CONSTRAINT leads_status_check 
CHECK (status IN ('new', 'assigned', 'contacted', 'qualified', 'converted', 'rejected'));

-- Ensure the table has proper indexing for status queries
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_converted_tenant_id ON public.leads(converted_tenant_id) WHERE converted_tenant_id IS NOT NULL;
