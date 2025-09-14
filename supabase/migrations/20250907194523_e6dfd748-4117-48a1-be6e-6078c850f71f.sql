-- Update RLS policies for master_companies table
-- Enable public read access for active companies (for AI suggestions and API access)

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can read active companies" ON public.master_companies;
DROP POLICY IF EXISTS "Authenticated users can read all companies" ON public.master_companies;
DROP POLICY IF EXISTS "Super admins can manage companies" ON public.master_companies;

-- Allow public read access for active/verified companies
CREATE POLICY "Public can read active companies" 
ON public.master_companies 
FOR SELECT 
USING (status IN ('active', 'verified'));

-- Allow authenticated users to read all companies
CREATE POLICY "Authenticated users can read all companies" 
ON public.master_companies 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow super admins to manage all companies
CREATE POLICY "Super admins can manage companies" 
ON public.master_companies 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  )
);