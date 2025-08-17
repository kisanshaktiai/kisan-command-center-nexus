
-- Update the INSERT policy for tenant-assets bucket to allow super admins
DROP POLICY IF EXISTS "Users can upload files to tenant-assets bucket" ON storage.objects;

CREATE POLICY "Users can upload files to tenant-assets bucket"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'tenant-assets' AND (
    -- Allow tenant owners/admins
    (SELECT tenant_id FROM tenants WHERE id = (storage.foldername(name))[1]::uuid) IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('tenant_owner', 'tenant_admin')
    )
    OR
    -- Allow authenticated admins (super_admin, platform_admin)
    is_authenticated_admin()
  )
);

-- Also update the SELECT policy to ensure super admins can access uploaded files
DROP POLICY IF EXISTS "Users can view files in tenant-assets bucket" ON storage.objects;

CREATE POLICY "Users can view files in tenant-assets bucket"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'tenant-assets' AND (
    -- Allow tenant owners/admins
    (SELECT tenant_id FROM tenants WHERE id = (storage.foldername(name))[1]::uuid) IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('tenant_owner', 'tenant_admin')
    )
    OR
    -- Allow authenticated admins (super_admin, platform_admin)
    is_authenticated_admin()
  )
);

-- Update the DELETE policy for completeness
DROP POLICY IF EXISTS "Users can delete files in tenant-assets bucket" ON storage.objects;

CREATE POLICY "Users can delete files in tenant-assets bucket"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'tenant-assets' AND (
    -- Allow tenant owners/admins
    (SELECT tenant_id FROM tenants WHERE id = (storage.foldername(name))[1]::uuid) IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('tenant_owner', 'tenant_admin')
    )
    OR
    -- Allow authenticated admins (super_admin, platform_admin)
    is_authenticated_admin()
  )
);
