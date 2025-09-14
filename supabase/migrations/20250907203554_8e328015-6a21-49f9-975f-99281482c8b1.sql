-- Add RLS policies for CORS support on master_product_categories
-- Allow authenticated users to read all categories
CREATE POLICY "Authenticated users can read categories" 
ON public.master_product_categories 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow API access with service role
CREATE POLICY "Service role can manage categories" 
ON public.master_product_categories 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Add RLS policies for CORS support on master_products  
-- Allow authenticated users to read all products
CREATE POLICY "Authenticated users can read products"
ON public.master_products
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow API access with service role  
CREATE POLICY "Service role can manage products"
ON public.master_products
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');