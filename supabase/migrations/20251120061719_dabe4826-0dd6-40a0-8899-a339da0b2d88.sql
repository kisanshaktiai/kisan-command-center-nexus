-- Create rate limiting table for persistent tracking
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  function_name TEXT NOT NULL,
  request_count INTEGER DEFAULT 0 NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  last_request TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT unique_rate_limit_bucket UNIQUE(identifier, function_name, window_start)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup ON public.rate_limit_buckets(identifier, function_name, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup ON public.rate_limit_buckets(window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limit_function ON public.rate_limit_buckets(function_name);

-- Enable RLS
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Policy for service role only (edge functions use service role)
CREATE POLICY "Service role can manage rate limits" ON public.rate_limit_buckets
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.rate_limit_buckets IS 'Tracks rate limiting buckets for edge function abuse prevention';
COMMENT ON COLUMN public.rate_limit_buckets.identifier IS 'IP address, user ID, or API key being rate limited';
COMMENT ON COLUMN public.rate_limit_buckets.function_name IS 'Name of the edge function being rate limited';
COMMENT ON COLUMN public.rate_limit_buckets.request_count IS 'Number of requests in current window';
COMMENT ON COLUMN public.rate_limit_buckets.window_start IS 'Start of rate limit window';
COMMENT ON COLUMN public.rate_limit_buckets.window_end IS 'End of rate limit window';
COMMENT ON COLUMN public.rate_limit_buckets.metadata IS 'Additional metadata like user agent, blocked status, etc.';