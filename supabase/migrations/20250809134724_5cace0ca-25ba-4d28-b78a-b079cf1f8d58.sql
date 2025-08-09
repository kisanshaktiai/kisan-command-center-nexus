
-- First, ensure the tenants table has all required columns for soft delete
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ NULL;

-- Create the tenant_archive_jobs table for tracking archive operations
CREATE TABLE IF NOT EXISTS tenant_archive_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  archive_location TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  reactivated_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for tenant_archive_jobs
ALTER TABLE tenant_archive_jobs ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all archive jobs
CREATE POLICY "Super admins can manage all archive jobs" 
  ON tenant_archive_jobs 
  FOR ALL 
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_suspended_at ON tenants(suspended_at);
CREATE INDEX IF NOT EXISTS idx_tenants_archived_at ON tenants(archived_at);
CREATE INDEX IF NOT EXISTS idx_tenant_archive_jobs_tenant_id ON tenant_archive_jobs(tenant_id);

-- Create function to handle tenant suspension
CREATE OR REPLACE FUNCTION suspend_tenant(p_tenant_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Update tenant status to suspended
  UPDATE tenants 
  SET 
    status = 'suspended',
    suspended_at = NOW(),
    updated_at = NOW(),
    metadata = COALESCE(metadata, '{}') || jsonb_build_object('suspension_reason', p_reason)
  WHERE id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant not found',
      'code', 'TENANT_NOT_FOUND'
    );
  END IF;

  -- Log the suspension action
  PERFORM log_admin_action(
    'tenant_suspended',
    NULL,
    jsonb_build_object('tenant_id', p_tenant_id, 'reason', p_reason)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Tenant suspended successfully',
    'tenant_id', p_tenant_id
  );
END;
$$;

-- Create function to handle tenant reactivation
CREATE OR REPLACE FUNCTION reactivate_tenant(p_tenant_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Update tenant status back to active
  UPDATE tenants 
  SET 
    status = 'active',
    reactivated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_tenant_id AND status = 'suspended';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant not found or not suspended',
      'code', 'TENANT_NOT_SUSPENDED'
    );
  END IF;

  -- Log the reactivation action
  PERFORM log_admin_action(
    'tenant_reactivated',
    NULL,
    jsonb_build_object('tenant_id', p_tenant_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Tenant reactivated successfully',
    'tenant_id', p_tenant_id
  );
END;
$$;

-- Create function to archive tenant data
CREATE OR REPLACE FUNCTION archive_tenant_data(p_tenant_id UUID, p_archive_location TEXT, p_encryption_key_id TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_archive_job_id UUID;
BEGIN
  -- Update tenant status to archived
  UPDATE tenants 
  SET 
    status = 'archived',
    archived_at = NOW(),
    updated_at = NOW()
  WHERE id = p_tenant_id AND status = 'suspended';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant not found or not suspended',
      'code', 'TENANT_NOT_SUSPENDED'
    );
  END IF;

  -- Create archive job record
  INSERT INTO tenant_archive_jobs (tenant_id, archive_location, encryption_key_id)
  VALUES (p_tenant_id, p_archive_location, p_encryption_key_id)
  RETURNING id INTO v_archive_job_id;

  -- Log the archival action
  PERFORM log_admin_action(
    'tenant_archived',
    NULL,
    jsonb_build_object('tenant_id', p_tenant_id, 'archive_job_id', v_archive_job_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Tenant archived successfully',
    'tenant_id', p_tenant_id,
    'archive_job_id', v_archive_job_id
  );
END;
$$;
