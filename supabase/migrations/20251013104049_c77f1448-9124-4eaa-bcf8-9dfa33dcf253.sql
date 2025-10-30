-- Enhance master_products table with comprehensive agricultural product information

-- Add new columns for world-class agricultural product management
ALTER TABLE public.master_products
  ADD COLUMN IF NOT EXISTS manufacturer_id UUID REFERENCES public.master_companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS distributor_id UUID REFERENCES public.master_companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS hsn_code TEXT,
  ADD COLUMN IF NOT EXISTS cas_number TEXT,
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS approval_authority TEXT,
  ADD COLUMN IF NOT EXISTS approval_date DATE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS batch_number TEXT,
  ADD COLUMN IF NOT EXISTS manufacturing_date DATE,
  ADD COLUMN IF NOT EXISTS shelf_life_months INTEGER,
  ADD COLUMN IF NOT EXISTS storage_instructions TEXT,
  ADD COLUMN IF NOT EXISTS storage_temperature_range JSONB DEFAULT '{"min": null, "max": null, "unit": "celsius"}'::jsonb,
  ADD COLUMN IF NOT EXISTS handling_precautions TEXT,
  ADD COLUMN IF NOT EXISTS first_aid_measures TEXT,
  ADD COLUMN IF NOT EXISTS disposal_instructions TEXT,
  ADD COLUMN IF NOT EXISTS environmental_impact JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pest_targets JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS disease_targets JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS weed_targets JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS nutrient_analysis JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS seed_variety_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS germination_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS purity_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS application_timing JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS crop_stages JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_season JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ph_range JSONB DEFAULT '{"min": null, "max": null}'::jsonb,
  ADD COLUMN IF NOT EXISTS water_solubility TEXT,
  ADD COLUMN IF NOT EXISTS compatibility_info JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS mixing_instructions TEXT,
  ADD COLUMN IF NOT EXISTS spray_volume_per_acre JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pre_harvest_interval_days INTEGER,
  ADD COLUMN IF NOT EXISTS re_entry_interval_hours INTEGER,
  ADD COLUMN IF NOT EXISTS minimum_order_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS maximum_order_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS available_pack_sizes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS discount_applicable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS quality_certifications JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lab_test_reports JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS usage_restrictions TEXT,
  ADD COLUMN IF NOT EXISTS warnings TEXT,
  ADD COLUMN IF NOT EXISTS country_of_origin TEXT,
  ADD COLUMN IF NOT EXISTS import_license_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS video_urls JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS technical_data_sheet_url TEXT,
  ADD COLUMN IF NOT EXISTS safety_data_sheet_url TEXT,
  ADD COLUMN IF NOT EXISTS user_reviews_summary JSONB DEFAULT '{"average_rating": 0, "total_reviews": 0}'::jsonb,
  ADD COLUMN IF NOT EXISTS market_availability TEXT CHECK (market_availability IN ('in_stock', 'limited_stock', 'out_of_stock', 'pre_order')),
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_master_products_manufacturer ON public.master_products(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_master_products_distributor ON public.master_products(distributor_id);
CREATE INDEX IF NOT EXISTS idx_master_products_barcode ON public.master_products(barcode);
CREATE INDEX IF NOT EXISTS idx_master_products_hsn_code ON public.master_products(hsn_code);
CREATE INDEX IF NOT EXISTS idx_master_products_registration_number ON public.master_products(registration_number);
CREATE INDEX IF NOT EXISTS idx_master_products_market_availability ON public.master_products(market_availability);
CREATE INDEX IF NOT EXISTS idx_master_products_is_featured ON public.master_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_master_products_popularity_score ON public.master_products(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_master_products_pest_targets ON public.master_products USING GIN(pest_targets);
CREATE INDEX IF NOT EXISTS idx_master_products_disease_targets ON public.master_products USING GIN(disease_targets);

-- Add comment for documentation
COMMENT ON TABLE public.master_products IS 'Enhanced master products table with comprehensive agricultural product information for world-class multi-tenant SaaS platform';
COMMENT ON COLUMN public.master_products.manufacturer_id IS 'Reference to the manufacturing company';
COMMENT ON COLUMN public.master_products.distributor_id IS 'Reference to the distributing company';
COMMENT ON COLUMN public.master_products.hsn_code IS 'Harmonized System of Nomenclature code for taxation';
COMMENT ON COLUMN public.master_products.cas_number IS 'Chemical Abstracts Service registry number';
COMMENT ON COLUMN public.master_products.registration_number IS 'Government registration/license number';
COMMENT ON COLUMN public.master_products.pest_targets IS 'Array of pests this product targets';
COMMENT ON COLUMN public.master_products.disease_targets IS 'Array of diseases this product treats';
COMMENT ON COLUMN public.master_products.nutrient_analysis IS 'NPK and other nutrient composition for fertilizers';
COMMENT ON COLUMN public.master_products.seed_variety_details IS 'Variety information for seeds';
COMMENT ON COLUMN public.master_products.application_timing IS 'Best timing for application (morning/evening/etc)';
COMMENT ON COLUMN public.master_products.crop_stages IS 'Suitable crop growth stages for application';