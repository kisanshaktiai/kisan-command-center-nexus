
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LegalDocument, LegalDocumentType } from '@/types/legalDocuments';

interface UploadDocumentParams {
  tenantId: string;
  file: File;
  documentType: LegalDocumentType;
  documentName?: string;
}

export const useLegalDocuments = (tenantId?: string) => {
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch documents for a tenant
  const { data: documents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['legal-documents', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('tenant_legal_documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('upload_order', { ascending: true });

      if (error) throw error;
      return data as LegalDocument[];
    },
    enabled: !!tenantId,
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ tenantId, file, documentType, documentName }: UploadDocumentParams) => {
      // Validate file
      if (!file.type.includes('pdf')) {
        throw new Error('Only PDF files are allowed');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size must be less than 10MB');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/${documentType}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tenant-legal-docs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tenant-legal-docs')
        .getPublicUrl(fileName);

      // Save document record
      const { data: documentData, error: documentError } = await supabase
        .from('tenant_legal_documents')
        .insert({
          tenant_id: tenantId,
          document_type: documentType,
          document_name: documentName || file.name,
          original_filename: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          verification_status: 'pending'
        })
        .select()
        .single();

      if (documentError) throw documentError;

      return documentData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents', tenantId] });
      toast({
        title: "Document Uploaded",
        description: `${data.document_name} has been uploaded successfully and is pending review.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      // Get document details first
      const { data: docData, error: fetchError } = await supabase
        .from('tenant_legal_documents')
        .select('file_url')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Extract file path from URL
      const urlParts = docData.file_url.split('/');
      const filePath = urlParts.slice(-3).join('/'); // Get tenant_id/document_type/filename

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('tenant-legal-docs')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete document record
      const { error: deleteError } = await supabase
        .from('tenant_legal_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;

      return documentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents', tenantId] });
      toast({
        title: "Document Deleted",
        description: "Document has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  // Download document
  const downloadDocument = useCallback(async (legalDocument: LegalDocument) => {
    try {
      // Extract file path from URL
      const urlParts = legalDocument.file_url.split('/');
      const filePath = urlParts.slice(-3).join('/');

      const { data, error } = await supabase.storage
        .from('tenant-legal-docs')
        .download(filePath);

      if (error) throw error;

      // Create download link using the global document object
      const url = URL.createObjectURL(data);
      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = legalDocument.original_filename;
      globalThis.document.body.appendChild(a);
      a.click();
      globalThis.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download document",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    documents,
    isLoading,
    error,
    refetch,
    uploadDocument: uploadDocumentMutation.mutate,
    isUploading: uploadDocumentMutation.isPending,
    deleteDocument: deleteDocumentMutation.mutate,
    isDeleting: deleteDocumentMutation.isPending,
    downloadDocument,
    uploadProgress,
  };
};
