
-- Backfill existing tenants where created_by is null
-- Find the first admin user for each tenant and set as creator
UPDATE public.tenants t
SET created_by = ut.user_id, updated_at = now()
FROM public.user_tenants ut
WHERE ut.tenant_id = t.id
  AND ut.role IN ('tenant_admin', 'tenant_owner', 'super_admin')
  AND ut.is_active = true
  AND t.created_by IS NULL
  AND ut.user_id IN (
    SELECT user_id 
    FROM public.user_tenants ut2 
    WHERE ut2.tenant_id = t.id 
      AND ut2.role IN ('tenant_admin', 'tenant_owner', 'super_admin')
      AND ut2.is_active = true
    ORDER BY 
      CASE 
        WHEN ut2.role = 'super_admin' THEN 1
        WHEN ut2.role = 'tenant_owner' THEN 2  
        WHEN ut2.role = 'tenant_admin' THEN 3
        ELSE 4
      END,
      ut2.created_at ASC
    LIMIT 1
  );

-- Verify the backfill worked - this should return 0 if successful
-- SELECT COUNT(*) FROM public.tenants WHERE created_by IS NULL;
