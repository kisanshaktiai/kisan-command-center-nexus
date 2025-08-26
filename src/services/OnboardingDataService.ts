
import { supabase } from '@/integrations/supabase/client';

export interface OnboardingStepData {
  stepName: string;
  stepData: any;
  tenantId: string;
  workflowId?: string;
}

export class OnboardingDataService {
  
  /**
   * Save company profile data to tenants table
   */
  static async saveCompanyProfile(data: any, tenantId: string) {
    try {
      const updateData = {
        name: data.companyName || data.name,
        owner_name: data.ownerName,
        owner_email: data.ownerEmail,
        owner_phone: data.ownerPhone,
        business_registration: data.businessRegistration,
        business_address: data.businessAddress,
        established_date: data.establishedDate,
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error saving company profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save branding data to tenant_branding table
   */
  static async saveBrandingData(data: any, tenantId: string) {
    try {
      const brandingData = {
        tenant_id: tenantId,
        primary_color: data.primaryColor,
        secondary_color: data.secondaryColor,
        accent_color: data.accentColor,
        background_color: data.backgroundColor,
        text_color: data.textColor,
        app_name: data.appName,
        app_tagline: data.appTagline,
        logo_url: data.logoUrl,
        font_family: data.fontFamily,
        settings: {
          customCss: data.customCss,
          theme: data.theme,
          layout: data.layout,
          ...data.additionalSettings
        }
      };

      const { data: result, error } = await supabase
        .from('tenant_branding')
        .upsert(brandingData, { onConflict: 'tenant_id' })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error saving branding data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save domain and whitelabel configuration
   */
  static async saveDomainWhitelabel(data: any, tenantId: string) {
    try {
      const domainData = {
        tenant_id: tenantId,
        custom_domain: data.customDomain,
        subdomain: data.subdomain,
        ssl_enabled: data.sslEnabled || false,
        domain_verified: false,
        dns_records: data.dnsRecords || {},
        whitelabel_config: {
          enableWhitelabel: data.enableWhitelabel,
          customBranding: data.customBranding,
          hideCredits: data.hideCredits,
          customFavicon: data.customFavicon,
          ...data.whitelabelSettings
        }
      };

      const { data: result, error } = await supabase
        .from('tenant_domains')
        .upsert(domainData, { onConflict: 'tenant_id' })
        .select()
        .single();

      if (error) throw error;

      // Update tenant with domain info
      await supabase
        .from('tenants')
        .update({
          subdomain: data.subdomain,
          custom_domain: data.customDomain
        })
        .eq('id', tenantId);

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error saving domain configuration:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Complete review and go live step
   */
  static async completeReviewGoLive(data: any, tenantId: string, workflowId?: string) {
    try {
      if (data.approved) {
        const { error: tenantError } = await supabase
          .from('tenants')
          .update({
            status: 'active',
            metadata: {
              ...data.metadata,
              onboarding_completed: true,
              go_live_date: new Date().toISOString()
            }
          })
          .eq('id', tenantId);

        if (tenantError) throw tenantError;

        if (workflowId) {
          await supabase
            .from('onboarding_workflows')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', workflowId);
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error completing review and go live:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generic step data saver that routes to specific handlers
   */
  static async saveStepData({ stepName, stepData, tenantId, workflowId }: OnboardingStepData) {
    console.log(`Saving data for step: ${stepName}`);
    
    try {
      let result = { success: true, message: 'Step data saved' };
      
      // Simple routing based on step name
      if (stepName.toLowerCase().includes('company') || stepName.toLowerCase().includes('profile')) {
        result = await this.saveCompanyProfile(stepData, tenantId);
      } else if (stepName.toLowerCase().includes('brand') || stepName.toLowerCase().includes('design')) {
        result = await this.saveBrandingData(stepData, tenantId);
      } else if (stepName.toLowerCase().includes('domain') || stepName.toLowerCase().includes('whitelabel')) {
        result = await this.saveDomainWhitelabel(stepData, tenantId);
      } else if (stepName.toLowerCase().includes('review') || stepName.toLowerCase().includes('live')) {
        result = await this.completeReviewGoLive(stepData, tenantId, workflowId);
      }

      // Always save to step_data as backup
      if (workflowId) {
        await this.updateStepData(workflowId, stepName, stepData);
      }

      return result;
    } catch (error: any) {
      console.error(`Error saving step data for ${stepName}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update step data in onboarding_steps table
   */
  private static async updateStepData(workflowId: string, stepName: string, stepData: any) {
    try {
      const { error } = await supabase
        .from('onboarding_steps')
        .update({
          step_data: stepData,
          updated_at: new Date().toISOString()
        })
        .eq('workflow_id', workflowId)
        .eq('step_name', stepName);

      if (error) {
        console.error('Error updating step data:', error);
      }
    } catch (error) {
      console.error('Error in updateStepData:', error);
    }
  }
}
