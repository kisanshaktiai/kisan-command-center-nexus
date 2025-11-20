import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { whiteLabelSyncService } from '@/services/WhiteLabelSyncService';

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
      
      // Log what we're loading for debugging
      if (data) {
        const configData = data as any;
        console.log('Loaded white-label config for tenant:', tenantId, {
          hasMobileTheme: !!configData.mobile_theme,
          hasThemeColors: !!configData.theme_colors,
          hasAppStoreConfig: !!configData.app_store_config?.mobile_theme
        });
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

      // Get current user for tracking
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      // Debug logging
      console.log('Saving white-label config:', {
        tenantId,
        userId: user?.id,
        hasMobileTheme: !!configData.mobile_theme,
        mobileThemeKeys: configData.mobile_theme ? Object.keys(configData.mobile_theme) : [],
        existingConfig: !!config
      });

      // Build cleaned data, preserving mobile_theme if it exists
      const cleanedData: any = {
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
        updated_at: now,
        updated_by: user?.id || null
      };

      // Only include these fields if they are explicitly provided
      if (configData.mobile_theme !== undefined) {
        cleanedData.mobile_theme = configData.mobile_theme;
      }
      if (configData.theme_colors !== undefined) {
        cleanedData.theme_colors = configData.theme_colors;
      }
      if (configData.api_version !== undefined) {
        cleanedData.api_version = configData.api_version;
      }
      if (configData.validation_errors !== undefined) {
        cleanedData.validation_errors = configData.validation_errors;
      }
      if (configData.is_validated !== undefined) {
        cleanedData.is_validated = configData.is_validated;
      }
      if (configData.last_synced_at !== undefined) {
        cleanedData.last_synced_at = configData.last_synced_at;
      }

      console.log('Cleaned data to save:', {
        hasMobileTheme: !!cleanedData.mobile_theme,
        mobileThemeKeys: cleanedData.mobile_theme ? Object.keys(cleanedData.mobile_theme) : [],
        updatedBy: cleanedData.updated_by
      });

      if (config?.id) {
        // Update existing config using sync service
        console.log('Updating existing config with ID:', config.id);
        
        const result = await whiteLabelSyncService.updateWhiteLabelConfig(
          tenantId,
          cleanedData
        );
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update configuration');
        }
        
        const data = result.data;
        const error = null;
        
        // Create audit log entry for update
        const auditEntry = {
          white_label_id: config.id,
          tenant_id: tenantId,
          change_type: 'UPDATE',
          changed_by: user?.id || null,
          full_snapshot: data,
          created_at: now
        };
        
        const { error: auditError } = await supabase
          .from('white_label_audit_log')
          .insert([auditEntry]);
          
        if (auditError) {
          console.error('Error creating audit log:', auditError);
          // Don't fail the operation if audit logging fails
        }
        
        console.log('Updated config result:', {
          hasMobileTheme: !!data?.mobile_theme,
          mobileThemeKeys: data?.mobile_theme ? Object.keys(data.mobile_theme) : [],
          auditLogged: !auditError
        });
        
        return data;
      } else {
        // Create new config using sync service
        console.log('Creating new config for tenant:', tenantId);
        
        const result = await whiteLabelSyncService.createWhiteLabelConfig(
          tenantId,
          cleanedData
        );
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create configuration');
        }
        
        const data = result.data;
        const error = null;
        
        // Create audit log entry for creation
        const auditEntry = {
          white_label_id: data.id,
          tenant_id: tenantId,
          change_type: 'CREATE',
          changed_by: user?.id || null,
          full_snapshot: data,
          created_at: now
        };
        
        const { error: auditError } = await supabase
          .from('white_label_audit_log')
          .insert([auditEntry]);
          
        if (auditError) {
          console.error('Error creating audit log:', auditError);
          // Don't fail the operation if audit logging fails
        }
        
        console.log('Created config result:', {
          hasMobileTheme: !!data?.mobile_theme,
          mobileThemeKeys: data?.mobile_theme ? Object.keys(data.mobile_theme) : [],
          auditLogged: !auditError
        });
        
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

      const tenantId = config.tenant_id;

      // Delete the white_label_config
      const { error } = await supabase
        .from('white_label_configs')
        .delete()
        .eq('id', config.id);
      
      if (error) {
        console.error('Error deleting white-label config:', error);
        throw error;
      }

      // Clear tenant's branding data
      await supabase
        .from('tenants')
        .update({
          subdomain: null,
          custom_domain: null,
          metadata: {
            branding_synced_from_wl: false,
            branding_deleted_at: new Date().toISOString()
          }
        })
        .eq('id', tenantId);
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
