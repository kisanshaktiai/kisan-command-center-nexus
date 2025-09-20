import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

      const cleanedData = {
        brand_identity: configData.brand_identity || {},
        domain_config: configData.domain_config || {},
        email_templates: configData.email_templates || {},
        app_store_config: configData.app_store_config || {},
        pwa_config: configData.pwa_config || {},
        splash_screens: configData.splash_screens || {},
        css_injection: configData.css_injection || {},
        app_customization: configData.app_customization || {},
        content_management: configData.content_management || {},
        distribution: configData.distribution || {},
        domain_health: configData.domain_health || {},
        mobile_theme: configData.mobile_theme || undefined,
        theme_colors: configData.theme_colors || undefined,
        api_version: configData.api_version || undefined,
        validation_errors: configData.validation_errors || undefined,
        is_validated: configData.is_validated || undefined,
        last_synced_at: configData.last_synced_at || undefined,
        updated_at: new Date().toISOString()
      };

      if (config?.id) {
        // Update existing config
        const { data, error } = await supabase
          .from('white_label_configs')
          .update(cleanedData)
          .eq('id', config.id)
          .select()
          .single();
        
        if (error) {
          console.error('Error updating white-label config:', error);
          throw error;
        }
        return data;
      } else {
        // Create new config
        const { data, error } = await supabase
          .from('white_label_configs')
          .insert([{ 
            ...cleanedData, 
            tenant_id: tenantId,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (error) {
          console.error('Error creating white-label config:', error);
          throw error;
        }
        return data;
      }
    },
    onSuccess: (data) => {
      // Update cache instantly with latest DB values
      queryClient.setQueryData(['white-label-config', tenantId], data);

      // No need to wait for background refetch, preview gets instant update
      toast.success('Configuration saved successfully — Preview updated');
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
