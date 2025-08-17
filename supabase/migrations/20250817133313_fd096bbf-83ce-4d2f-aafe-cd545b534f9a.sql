
-- Create enum for legal document types
CREATE TYPE legal_document_type AS ENUM (
  'incorporation_certificate',
  'gst_certificate', 
  'pan_card',
  'address_proof',
  'bank_statement',
  'trade_license',
  'msme_certificate',
  'other'
);

-- Create enum for verification status
CREATE TYPE verification_status AS ENUM (
  'pending',
  'under_review',
  'approved',
  'rejected',
  'expired'
);

-- Create tenant_legal_documents table
CREATE TABLE public.tenant_legal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_type legal_document_type NOT NULL,
  document_name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES public.admin_users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  expiry_date DATE,
  is_required BOOLEAN NOT NULL DEFAULT true,
  upload_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for legal documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-legal-docs', 
  'tenant-legal-docs', 
  false, 
  10485760, -- 10MB limit
  ARRAY['application/pdf']
);

-- Add indexes for better performance
CREATE INDEX idx_tenant_legal_documents_tenant_id ON public.tenant_legal_documents(tenant_id);
CREATE INDEX idx_tenant_legal_documents_type ON public.tenant_legal_documents(document_type);
CREATE INDEX idx_tenant_legal_documents_status ON public.tenant_legal_documents(verification_status);

-- Add trigger for updated_at
CREATE TRIGGER tenant_legal_documents_updated_at
  BEFORE UPDATE ON public.tenant_legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on the table
ALTER TABLE public.tenant_legal_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_legal_documents
CREATE POLICY "Tenant users can view their own legal documents"
  ON public.tenant_legal_documents FOR SELECT
  USING (tenant_id IN (
    SELECT user_tenants.tenant_id FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() AND user_tenants.is_active = true
  ));

CREATE POLICY "Tenant users can insert their own legal documents"
  ON public.tenant_legal_documents FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT user_tenants.tenant_id FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() AND user_tenants.is_active = true
  ));

CREATE POLICY "Tenant users can update their own legal documents"
  ON public.tenant_legal_documents FOR UPDATE
  USING (tenant_id IN (
    SELECT user_tenants.tenant_id FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() AND user_tenants.is_active = true
  ));

CREATE POLICY "Tenant users can delete their own legal documents"
  ON public.tenant_legal_documents FOR DELETE
  USING (tenant_id IN (
    SELECT user_tenants.tenant_id FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() AND user_tenants.is_active = true
  ));

CREATE POLICY "Admin users can manage all legal documents"
  ON public.tenant_legal_documents FOR ALL
  USING (is_authenticated_admin());

-- Storage RLS Policies
CREATE POLICY "Tenant users can upload their legal documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tenant-legal-docs' AND
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Tenant users can view their legal documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'tenant-legal-docs' AND
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Tenant users can update their legal documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tenant-legal-docs' AND
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Tenant users can delete their legal documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tenant-legal-docs' AND
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admin users can manage all legal document files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'tenant-legal-docs' AND
    is_authenticated_admin()
  );
