
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
        name: data.companyName,
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

      // Update onboarding status
      await this.updateOnboardingStatus(tenantId, { company_profile_completed: true });

      return { success: true, data: result };
    } catch (error) {
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

      // Upsert branding data
      const { data: result, error } = await supabase
        .from('tenant_branding')
        .upsert(brandingData, { onConflict: 'tenant_id' })
        .select()
        .single();

      if (error) throw error;

      // Update onboarding status
      await this.updateOnboardingStatus(tenantId, { branding_completed: true });

      return { success: true, data: result };
    } catch (error) {
      console.error('Error saving branding data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save users and roles data to user_tenants table
   */
  static async saveUsersRoles(data: any, tenantId: string) {
    try {
      const results = [];
      
      // Process each user invitation/role assignment
      if (data.users && Array.isArray(data.users)) {
        for (const user of data.users) {
          if (user.email && user.role) {
            // Create user invitation record
            const invitationData = {
              tenant_id: tenantId,
              email: user.email,
              invitation_type: 'team_member',
              role: user.role,
              invited_by: (await supabase.auth.getUser()).data.user?.id,
              invitation_token: this.generateInvitationToken(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
            };

            const { data: invitation, error } = await supabase
              .from('user_invitations')
              .insert(invitationData)
              .select()
              .single();

            if (error) {
              console.error('Error creating user invitation:', error);
            } else {
              results.push(invitation);
            }
          }
        }
      }

      // Save role configurations
      if (data.rolePermissions) {
        // Store role configurations in tenant metadata
        const { error: tenantError } = await supabase
          .from('tenants')
          .update({
            metadata: {
              role_permissions: data.rolePermissions,
              team_structure: data.teamStructure
            }
          })
          .eq('id', tenantId);

        if (tenantError) {
          console.error('Error saving role permissions:', tenantError);
        }
      }

      // Update onboarding status
      await this.updateOnboardingStatus(tenantId, { users_roles_completed: true });

      return { success: true, data: results };
    } catch (error) {
      console.error('Error saving users and roles:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save billing and plan data
   */
  static async saveBillingPlan(data: any, tenantId: string) {
    try {
      // Update tenant subscription plan
      const tenantUpdate = {
        subscription_plan: data.selectedPlan,
        subscription_start_date: data.startDate,
        subscription_end_date: data.endDate,
        trial_ends_at: data.trialEndsAt
      };

      const { error: tenantError } = await supabase
        .from('tenants')
        .update(tenantUpdate)
        .eq('id', tenantId);

      if (tenantError) throw tenantError;

      // Save billing information if provided
      if (data.billingInfo) {
        const subscriptionData = {
          tenant_id: tenantId,
          subscription_plan: data.selectedPlan,
          billing_interval: data.billingInterval || 'monthly', // Add required billing_interval
          status: 'active',
          current_period_start: data.startDate,
          current_period_end: data.endDate,
          billing_address: data.billingInfo.address,
          payment_method: data.billingInfo.paymentMethod
        };

        const { error: subscriptionError } = await supabase
          .from('tenant_subscriptions')
          .upsert(subscriptionData, { onConflict: 'tenant_id' });

        if (subscriptionError) {
          console.error('Error saving subscription:', subscriptionError);
        }
      }

      // Update onboarding status
      await this.updateOnboardingStatus(tenantId, { billing_completed: true });

      return { success: true };
    } catch (error) {
      console.error('Error saving billing plan:', error);
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
        domain_verified: false, // Will be verified later
        dns_records: data.dnsRecords || {},
        whitelabel_config: {
          enableWhitelabel: data.enableWhitelabel,
          customBranding: data.customBranding,
          hideCredits: data.hideCredits,
          customFavicon: data.customFavicon,
          ...data.whitelabelSettings
        }
      };

      // Upsert domain configuration
      const { data: result, error } = await supabase
        .from('tenant_domains')
        .upsert(domainData, { onConflict: 'tenant_id' })
        .select()
        .single();

      if (error) throw error;

      // Update tenant with domain info
      const tenantUpdate = {
        subdomain: data.subdomain,
        custom_domain: data.customDomain
      };

      await supabase
        .from('tenants')
        .update(tenantUpdate)
        .eq('id', tenantId);

      // Update onboarding status
      await this.updateOnboardingStatus(tenantId, { domain_completed: true });

      return { success: true, data: result };
    } catch (error) {
      console.error('Error saving domain configuration:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Complete review and go live step
   */
  static async completeReviewGoLive(data: any, tenantId: string, workflowId?: string) {
    try {
      // Update tenant status to active if approved
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

        // Mark workflow as completed
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

      // Update onboarding status
      await this.updateOnboardingStatus(tenantId, { 
        review_completed: true,
        overall_completion_percentage: 100
      });

      return { success: true };
    } catch (error) {
      console.error('Error completing review and go live:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update onboarding completion status
   */
  private static async updateOnboardingStatus(tenantId: string, updates: any) {
    try {
      const { error } = await supabase
        .from('tenant_onboarding_status')
        .upsert({
          tenant_id: tenantId,
          ...updates,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id' });

      if (error) {
        console.error('Error updating onboarding status:', error);
      }
    } catch (error) {
      console.error('Error in updateOnboardingStatus:', error);
    }
  }

  /**
   * Generic step data saver that routes to specific handlers
   */
  static async saveStepData({ stepName, stepData, tenantId, workflowId }: OnboardingStepData) {
    const normalizedStepName = stepName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    console.log(`Saving data for step: ${stepName} (normalized: ${normalizedStepName})`);
    
    try {
      let result;
      
      switch (normalizedStepName) {
        case 'company_profile':
          result = await this.saveCompanyProfile(stepData, tenantId);
          break;
          
        case 'branding_design':
        case 'enhanced_branding':
          result = await this.saveBrandingData(stepData, tenantId);
          break;
          
        case 'users_roles':
        case 'team_permissions':
        case 'enhanced_users_roles':
          result = await this.saveUsersRoles(stepData, tenantId);
          break;
          
        case 'billing_plan':
          result = await this.saveBillingPlan(stepData, tenantId);
          break;
          
        case 'domain_whitelabel':
        case 'domain_branding':
          result = await this.saveDomainWhitelabel(stepData, tenantId);
          break;
          
        case 'review_go_live':
        case 'review_launch':
          result = await this.completeReviewGoLive(stepData, tenantId, workflowId);
          break;
          
        default:
          console.warn(`No specific handler for step: ${normalizedStepName}`);
          result = { success: true, message: 'Step data saved to workflow only' };
      }

      // Always save to step_data as backup
      if (workflowId) {
        await this.updateStepData(workflowId, stepName, stepData);
      }

      return result;
    } catch (error) {
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

  /**
   * Generate a secure invitation token
   */
  private static generateInvitationToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Get onboarding completion status
   */
  static async getOnboardingStatus(tenantId: string) {
    try {
      const { data, error } = await supabase
        .from('tenant_onboarding_status')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw error;
      }

      return { success: true, data: data || null };
    } catch (error) {
      console.error('Error getting onboarding status:', error);
      return { success: false, error: error.message };
    }
  }
}
