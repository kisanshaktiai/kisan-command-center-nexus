
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';

// Import the new compact panels
import { BrandIdentityPanel } from '@/components/white-label/BrandIdentityPanel';
import { DomainConfigPanel } from '@/components/white-label/DomainConfigPanel';
import { EmailTemplatesPanel } from '@/components/white-label/EmailTemplatesPanel';
import { CSSInjectionPanel } from '@/components/white-label/CSSInjectionPanel';
import { DomainHealthPanel } from '@/components/white-label/DomainHealthPanel';
import { ContentManagementPanel } from '@/components/white-label/ContentManagementPanel';
import { DistributionOptionsPanel } from '@/components/white-label/DistributionOptionsPanel';
import { AdvancedAppCustomizationPanel } from '@/components/white-label/AdvancedAppCustomizationPanel';

interface WhiteLabelConfig {
  id: string;
  tenant_id: string;
  brand_identity: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    font_family?: string;
    company_name?: string;
  };
  domain_config: {
    custom_domain?: string;
    subdomain?: string;
    ssl_enabled?: boolean;
    redirect_urls?: string[];
  };
  email_templates: {
    welcome_template?: string;
    notification_template?: string;
    invoice_template?: string;
    header_color?: string;
    footer_text?: string;
  };
  app_store_config: {
    app_name?: string;
    app_description?: string;
    app_icon?: string;
    screenshots?: string[];
    keywords?: string[];
    category?: string;
  };
  pwa_config: {
    app_name?: string;
    short_name?: string;
    description?: string;
    theme_color?: string;
    background_color?: string;
    display?: string;
    orientation?: string;
    icons?: Array<{
      src: string;
      sizes: string;
      type: string;
    }>;
  };
  splash_screens: {
    mobile_splash?: string;
    tablet_splash?: string;
    desktop_splash?: string;
    loading_animation?: string;
  };
  css_injection?: {
    enabled?: boolean;
    custom_css?: string;
    mobile_css?: string;
    print_css?: string;
  };
  app_customization?: {
    bundle_id?: string;
    app_version?: string;
    build_number?: number;
    minimum_ios_version?: string;
    minimum_android_version?: string;
    supported_languages?: string;
    custom_menu?: any[];
    visible_modules?: Record<string, boolean>;
    custom_fields?: string;
    business_rules?: string;
    loading_animation_url?: string;
    transition_duration?: number;
    animations_enabled?: boolean;
    respect_reduce_motion?: boolean;
    animation_preset?: string;
  };
  content_management?: {
    help_center_url?: string;
    documentation_url?: string;
    getting_started_guide?: string;
    onboarding_video?: string;
    tutorial_videos?: string[];
    terms_of_service?: string;
    privacy_policy?: string;
    data_processing_agreement?: string;
    faq_items?: Array<{ question: string; answer: string }>;
    custom_messaging_enabled?: boolean;
    welcome_message?: string;
    success_messages?: string;
    error_messages?: string;
  };
  distribution?: {
    pwa_enabled?: boolean;
    pwa_install_prompt?: string;
    pwa_offline_support?: boolean;
    pwa_cache_strategy?: string;
    private_store_enabled?: boolean;
    store_url?: string;
    store_name?: string;
    distribution_groups?: string;
    require_authentication?: boolean;
    url_scheme?: string;
    universal_links_domain?: string;
    deep_link_routes?: string;
    update_channel?: string;
    auto_updates?: boolean;
    update_check_interval?: number;
    force_update?: boolean;
    minimum_version?: string;
    update_message?: string;
  };
  created_at: string;
  updated_at: string;
}

interface Tenant {
  id: string;
  name: string;
}

export default function WhiteLabelConfig() {
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [config, setConfig] = useState<WhiteLabelConfig | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const queryClient = useQueryClient();

  // Fetch tenants
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants-for-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return (data || []) as Tenant[];
    }
  });

  // Fetch white-label config for selected tenant
  const { data: whiteLabelConfig, isLoading: configLoading } = useQuery({
    queryKey: ['white-label-config', selectedTenant],
    queryFn: async () => {
      if (!selectedTenant) return null;
      
      const { data, error } = await supabase
        .from('white_label_configs')
        .select('*')
        .eq('tenant_id', selectedTenant)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as WhiteLabelConfig | null;
    },
    enabled: !!selectedTenant
  });

  useEffect(() => {
    if (whiteLabelConfig) {
      setConfig(whiteLabelConfig);
    } else if (selectedTenant) {
      // Initialize with default config
      setConfig({
        id: '',
        tenant_id: selectedTenant,
        brand_identity: {
          primary_color: '#3b82f6',
          secondary_color: '#64748b',
          accent_color: '#10b981',
          font_family: 'Inter',
          company_name: ''
        },
        domain_config: {
          ssl_enabled: true,
          redirect_urls: []
        },
        email_templates: {
          header_color: '#3b82f6',
          footer_text: 'Powered by KisanShaktiAI'
        },
        app_store_config: {
          category: 'Agriculture',
          keywords: ['agriculture', 'farming', 'crops']
        },
        pwa_config: {
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#3b82f6',
          background_color: '#ffffff',
          icons: []
        },
        splash_screens: {},
        css_injection: {
          enabled: false,
          custom_css: '',
          mobile_css: '',
          print_css: ''
        },
        app_customization: {
          animations_enabled: true,
          respect_reduce_motion: true,
          transition_duration: 300,
          animation_preset: 'standard',
          visible_modules: {}
        },
        content_management: {
          custom_messaging_enabled: false,
          faq_items: []
        },
        distribution: {
          pwa_enabled: true,
          auto_updates: true,
          update_channel: 'stable',
          update_check_interval: 24
        },
        created_at: '',
        updated_at: ''
      });
    }
  }, [whiteLabelConfig, selectedTenant]);

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: Partial<WhiteLabelConfig>) => {
      if (whiteLabelConfig) {
        const { data, error } = await supabase
          .from('white_label_configs')
          .update(configData)
          .eq('id', whiteLabelConfig.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('white_label_configs')
          .insert([{ ...configData, tenant_id: selectedTenant }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['white-label-config'] });
      toast.success('Configuration saved successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to save configuration: ' + error.message);
    }
  });

  const handleSave = () => {
    if (!config) return;
    
    const configData = {
      brand_identity: config.brand_identity,
      domain_config: config.domain_config,
      email_templates: config.email_templates,
      app_store_config: config.app_store_config,
      pwa_config: config.pwa_config,
      splash_screens: config.splash_screens,
      css_injection: config.css_injection,
      app_customization: config.app_customization,
      content_management: config.content_management,
      distribution: config.distribution
    };
    
    saveConfigMutation.mutate(configData);
  };

  const updateConfig = (section: keyof WhiteLabelConfig, field: string, value: any) => {
    if (!config) return;
    
    const currentSection = config[section];
    const sectionValue = typeof currentSection === 'object' && currentSection !== null ? currentSection : {};
    
    setConfig({
      ...config,
      [section]: {
        ...sectionValue,
        [field]: value
      }
    });
  };

  if (tenantsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="White-Label Configuration"
        description="Customize branding and appearance for tenants"
        badge={{ text: "Advanced", variant: "secondary" }}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
              size="sm"
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? 'Exit Preview' : 'Preview'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!config || saveConfigMutation.isPending}
              size="sm"
            >
              {saveConfigMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Configuration
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="space-y-3 p-3">
          {/* Tenant Selection - Reduced padding */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Select Tenant</CardTitle>
              <CardDescription className="text-sm">
                Choose a tenant to configure white-label settings
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <select
                className="w-full p-2 text-sm border rounded-md bg-background"
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
              >
                <option value="">Select a tenant...</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {selectedTenant && config && (
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-3">
                <BrandIdentityPanel config={config} updateConfig={updateConfig} />
                <DomainConfigPanel config={config} updateConfig={updateConfig} />
                <EmailTemplatesPanel config={config} updateConfig={updateConfig} />
                <DomainHealthPanel config={config} />
              </div>
              
              <div className="space-y-3">
                <CSSInjectionPanel config={config} updateConfig={updateConfig} />
                <AdvancedAppCustomizationPanel config={config} updateConfig={updateConfig} />
                <ContentManagementPanel config={config} updateConfig={updateConfig} />
                <DistributionOptionsPanel config={config} updateConfig={updateConfig} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
