import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailTemplateService } from '@/services/EmailTemplateService';
import { toast } from 'sonner';
import type { EmailTemplate } from '@/types/email';

export const useEmailTemplates = (filters?: {
  tenantId?: string;
  category?: string;
  isActive?: boolean;
  templateType?: string;
}) => {
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['email-templates', filters],
    queryFn: async () => {
      const result = await emailTemplateService.getTemplates(filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data || [];
    }
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['email-template-categories'],
    queryFn: async () => {
      const result = await emailTemplateService.getCategories();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data || [];
    }
  });

  // Create template
  const createMutation = useMutation({
    mutationFn: async (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const result = await emailTemplateService.createTemplate(template);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`);
    }
  });

  // Update template
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EmailTemplate> }) => {
      const result = await emailTemplateService.updateTemplate(id, updates);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`);
    }
  });

  // Delete template
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await emailTemplateService.deleteTemplate(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    }
  });

  // Duplicate template
  const duplicateMutation = useMutation({
    mutationFn: async ({ id, tenantId }: { id: string; tenantId?: string }) => {
      const result = await emailTemplateService.duplicateTemplate(id, tenantId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template duplicated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate template: ${error.message}`);
    }
  });

  return {
    templates,
    categories,
    isLoading,
    error,
    createTemplate: createMutation.mutate,
    updateTemplate: updateMutation.mutate,
    deleteTemplate: deleteMutation.mutate,
    duplicateTemplate: duplicateMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDuplicating: duplicateMutation.isPending
  };
};
