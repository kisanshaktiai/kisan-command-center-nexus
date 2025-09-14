-- Create master product categories table
CREATE TABLE public.master_product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES public.master_product_categories(id) ON DELETE SET NULL,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create master companies table
CREATE TABLE public.master_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  company_type TEXT DEFAULT 'manufacturer',
  description TEXT,
  logo_url TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  address JSONB,
  gst_number TEXT,
  pan_number TEXT,
  certifications JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'verified')),
  is_potential_tenant BOOLEAN DEFAULT true,
  converted_to_tenant BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create master products table
CREATE TABLE public.master_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.master_companies(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.master_product_categories(id) ON DELETE RESTRICT,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT DEFAULT 'fertilizer' CHECK (product_type IN ('fertilizer', 'pesticide', 'herbicide', 'fungicide', 'seed', 'equipment', 'other')),
  brand TEXT,
  active_ingredients JSONB DEFAULT '[]'::jsonb,
  composition TEXT,
  dosage_instructions TEXT,
  application_method TEXT,
  suitable_crops JSONB DEFAULT '[]'::jsonb,
  suitable_soil_types JSONB DEFAULT '[]'::jsonb,
  weather_conditions JSONB DEFAULT '{}'::jsonb,
  packaging_options JSONB DEFAULT '[]'::jsonb,
  price_range JSONB DEFAULT '{}'::jsonb,
  effectiveness_rating NUMERIC(3,2) CHECK (effectiveness_rating >= 0 AND effectiveness_rating <= 5),
  safety_level TEXT CHECK (safety_level IN ('low', 'moderate', 'high', 'very_high')),
  organic_certified BOOLEAN DEFAULT false,
  ai_recommendable BOOLEAN DEFAULT true,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_approval', 'discontinued')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_master_companies_status ON public.master_companies(status);
CREATE INDEX idx_master_companies_is_potential_tenant ON public.master_companies(is_potential_tenant);
CREATE INDEX idx_master_products_company_id ON public.master_products(company_id);
CREATE INDEX idx_master_products_category_id ON public.master_products(category_id);
CREATE INDEX idx_master_products_status ON public.master_products(status);
CREATE INDEX idx_master_products_ai_recommendable ON public.master_products(ai_recommendable);
CREATE INDEX idx_master_products_suitable_crops ON public.master_products USING GIN(suitable_crops);

-- Enable RLS
ALTER TABLE public.master_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for master_product_categories
CREATE POLICY "Super admins can manage product categories"
ON public.master_product_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'platform_admin')
    AND is_active = true
  )
);

CREATE POLICY "Public can view active product categories"
ON public.master_product_categories
FOR SELECT
USING (is_active = true);

-- RLS Policies for master_companies
CREATE POLICY "Super admins can manage master companies"
ON public.master_companies
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'platform_admin')
    AND is_active = true
  )
);

CREATE POLICY "Public can view active master companies"
ON public.master_companies
FOR SELECT
USING (status = 'active');

-- RLS Policies for master_products
CREATE POLICY "Super admins can manage master products"
ON public.master_products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'platform_admin')
    AND is_active = true
  )
);

CREATE POLICY "Public can view active and AI recommendable products"
ON public.master_products
FOR SELECT
USING (status = 'active' AND ai_recommendable = true);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_master_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_master_product_categories_updated_at
BEFORE UPDATE ON public.master_product_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_master_data_updated_at();

CREATE TRIGGER update_master_companies_updated_at
BEFORE UPDATE ON public.master_companies
FOR EACH ROW
EXECUTE FUNCTION public.update_master_data_updated_at();

CREATE TRIGGER update_master_products_updated_at
BEFORE UPDATE ON public.master_products
FOR EACH ROW
EXECUTE FUNCTION public.update_master_data_updated_at();