
-- Create table for pending admin requests
CREATE TABLE public.pending_admin_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  request_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Add Row Level Security
ALTER TABLE public.pending_admin_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for super admins to manage requests
CREATE POLICY "Super admins can manage all pending requests" 
  ON public.pending_admin_requests 
  FOR ALL 
  USING ((auth.jwt() ->> 'email'::text) ~~ '%admin%'::text);

-- Create policy for users to view their own requests
CREATE POLICY "Users can view their own pending requests" 
  ON public.pending_admin_requests 
  FOR SELECT 
  USING (auth.jwt() ->> 'email'::text = email);

-- Create index for faster lookups
CREATE INDEX idx_pending_admin_requests_email ON public.pending_admin_requests(email);
CREATE INDEX idx_pending_admin_requests_token ON public.pending_admin_requests(request_token);
CREATE INDEX idx_pending_admin_requests_status ON public.pending_admin_requests(status);
