import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Type definitions (will be replaced with @kisanshakti/whitelabel-types when available)
export interface WhiteLabelConfigData {
  id?: string;
  tenant_id: string;
  brand_identity?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    font_family?: string;
    company_name?: string;
    app_name?: string;
    tagline?: string;
    [key: string]: any;
  };
  domain_config?: Record<string, any>;
  email_templates?: Record<string, any>;
  app_store_config?: Record<string, any>;
  pwa_config?: Record<string, any>;
  splash_screens?: Record<string, any>;
  css_injection?: Record<string, any>;
  app_customization?: Record<string, any>;
  content_management?: Record<string, any>;
  distribution?: Record<string, any>;
  domain_health?: Record<string, any>;
  mobile_theme?: Record<string, any>;
  theme_colors?: Record<string, any>;
  api_version?: string;
  validation_errors?: any[];
  is_validated?: boolean;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
  schema_version?: number;
}

// Validation functions (will be replaced with @kisanshakti/whitelabel-types when available)
export function validateWhiteLabelConfig(config: WhiteLabelConfigData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.tenant_id) {
    errors.push('tenant_id is required');
  }

  // Validate CSS injection for dangerous patterns
  if (config.css_injection) {
    const dangerousPatterns = [
      /@import/i,
      /javascript:/i,
      /<script/i,
      /expression\(/i,
      /behavior:/i,
      /-moz-binding/i,
      /data:text\/html/i,
    ];

    for (const [key, value] of Object.entries(config.css_injection)) {
      if (typeof value === 'string') {
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            errors.push(`Dangerous pattern detected in css_injection.${key}`);
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function sanitizeWhiteLabelConfig(config: WhiteLabelConfigData): WhiteLabelConfigData {
  const sanitized = { ...config };

  // Sanitize CSS injection
  if (sanitized.css_injection) {
    const dangerousPatterns = [
      { pattern: /@import/gi, replacement: '/* @import blocked */' },
      { pattern: /javascript:/gi, replacement: '/* javascript: blocked */' },
      { pattern: /<script/gi, replacement: '/* script blocked */' },
      { pattern: /expression\(/gi, replacement: '/* expression blocked */' },
      { pattern: /behavior:/gi, replacement: '/* behavior blocked */' },
      { pattern: /-moz-binding/gi, replacement: '/* moz-binding blocked */' },
      { pattern: /data:text\/html/gi, replacement: '/* data uri blocked */' },
    ];

    for (const [key, value] of Object.entries(sanitized.css_injection)) {
      if (typeof value === 'string') {
        let sanitizedValue = value;
        for (const { pattern, replacement } of dangerousPatterns) {
          sanitizedValue = sanitizedValue.replace(pattern, replacement);
        }
        sanitized.css_injection[key] = sanitizedValue;
      }
    }
  }

  return sanitized;
}

export const useWhiteLabelConfig = (tenantId: string | null) => {
  const queryClient = useQueryClient();

  // Fetch white-label config for selected tenant
  const { data: config, isLoading, error, refetch } = useQuery({
    queryKey: ['white-label-config', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('white_label_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching white-label config:', error);
        throw error;
      }
      
      // Convert tag_line to tagline if it exists in brand_identity
      if (data?.brand_identity && typeof data.brand_identity === 'object' && !Array.isArray(data.brand_identity)) {
        const brandIdentity = data.brand_identity as any;
        if ('tag_line' in brandIdentity) {
          const { tag_line, ...restBrandIdentity } = brandIdentity;
          data.brand_identity = {
            ...restBrandIdentity,
            tagline: tag_line
          };
        }
      }
      
      return data as WhiteLabelConfigData | null;
    },
    enabled: !!tenantId,
    refetchOnWindowFocus: false,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Save configuration mutation
  const saveMutation = useMutation({
    mutationFn: async (configData: Partial<WhiteLabelConfigData>) => {
      if (!tenantId) {
        throw new Error('No tenant selected');
      }

      // Validate configuration before saving
      const { valid, errors } = validateWhiteLabelConfig({ ...configData, tenant_id: tenantId });
      if (!valid) {
        throw new Error('Validation failed: ' + errors.join(', '));
      }

      // Sanitize the configuration
      const sanitizedConfig = sanitizeWhiteLabelConfig({ ...configData, tenant_id: tenantId });

      // Call the edge function to save the configuration
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('save-white-label-config', {
        body: sanitizedConfig,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        console.error('Error saving white-label config:', response.error);
        throw new Error(response.error.message || 'Failed to save configuration');
      }

      return response.data?.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['white-label-config', tenantId], data);
      queryClient.invalidateQueries({ queryKey: ['white-label-config', tenantId] });
      toast.success('Configuration saved successfully');
    },
    onError: (error: any) => {
      console.error('Save configuration error:', error);
      toast.error('Failed to save configuration: ' + (error.message || 'Unknown error'));
    }
  });

  // Delete configuration mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!config?.id) {
        throw new Error('No configuration to delete');
      }

      const { error } = await supabase
        .from('white_label_configs')
        .delete()
        .eq('id', config.id);
      
      if (error) {
        console.error('Error deleting white-label config:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['white-label-config', tenantId], null);
      queryClient.invalidateQueries({ queryKey: ['white-label-config', tenantId] });
      toast.success('Configuration deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete configuration error:', error);
      toast.error('Failed to delete configuration: ' + (error.message || 'Unknown error'));
    }
  });

  return {
    config,
    isLoading,
    error,
    refetch,
    saveConfig: saveMutation.mutate,
    saveConfigAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteConfig: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
};