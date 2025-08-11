
import { supabase } from '@/integrations/supabase/client';
import type { Lead } from '@/types/leads';

export interface ConversionValidationResult {
  isValid: boolean;
  tenantExists: boolean;
  tenantActive: boolean;
  adminUserExists: boolean;
  issues: string[];
  recommendedAction: 'none' | 'revert_status' | 'retry_conversion' | 'manual_intervention';
}

export class LeadConversionValidator {
  /**
   * Validates if a converted lead actually has a properly created tenant
   */
  static async validateConvertedLead(lead: Lead): Promise<ConversionValidationResult> {
    const issues: string[] = [];
    let tenantExists = false;
    let tenantActive = false;
    let adminUserExists = false;
    let recommendedAction: ConversionValidationResult['recommendedAction'] = 'none';

    try {
      // Check if lead is marked as converted
      if (lead.status !== 'converted' || !lead.converted_tenant_id) {
        return {
          isValid: true,
          tenantExists: false,
          tenantActive: false,
          adminUserExists: false,
          issues: [],
          recommendedAction: 'none'
        };
      }

      // Check if tenant exists
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, status, owner_email')
        .eq('id', lead.converted_tenant_id)
        .maybeSingle();

      if (tenantError) {
        console.error('Error checking tenant:', tenantError);
        issues.push(`Database error checking tenant: ${tenantError.message}`);
      }

      if (!tenant) {
        tenantExists = false;
        issues.push('Tenant record not found in database');
        recommendedAction = 'revert_status';
      } else {
        tenantExists = true;
        
        // Check if tenant is active
        if (tenant.status === 'active' || tenant.status === 'trial') {
          tenantActive = true;
        } else {
          issues.push(`Tenant exists but status is: ${tenant.status}`);
          recommendedAction = 'manual_intervention';
        }

        // Check if admin user exists for this tenant
        const { data: adminUsers, error: adminError } = await supabase
          .from('admin_users')
          .select('id, email, is_active')
          .eq('email', tenant.owner_email || lead.email)
          .eq('is_active', true);

        if (adminError) {
          console.error('Error checking admin users:', adminError);
          issues.push(`Error checking admin users: ${adminError.message}`);
        }

        if (!adminUsers || adminUsers.length === 0) {
          issues.push('No active admin user found for tenant');
          recommendedAction = recommendedAction === 'none' ? 'retry_conversion' : recommendedAction;
        } else {
          adminUserExists = true;
        }

        // Check if user_tenants relationship exists
        const { data: userTenants, error: userTenantsError } = await supabase
          .from('user_tenants')
          .select('id, user_id, is_active')
          .eq('tenant_id', lead.converted_tenant_id)
          .eq('is_active', true);

        if (userTenantsError) {
          console.error('Error checking user_tenants:', userTenantsError);
          issues.push(`Error checking user-tenant relationships: ${userTenantsError.message}`);
        }

        if (!userTenants || userTenants.length === 0) {
          issues.push('No active user-tenant relationship found');
          recommendedAction = recommendedAction === 'none' ? 'retry_conversion' : recommendedAction;
        }
      }

      const isValid = tenantExists && tenantActive && adminUserExists && issues.length === 0;

      return {
        isValid,
        tenantExists,
        tenantActive,
        adminUserExists,
        issues,
        recommendedAction: isValid ? 'none' : recommendedAction
      };

    } catch (error) {
      console.error('Error validating converted lead:', error);
      return {
        isValid: false,
        tenantExists: false,
        tenantActive: false,
        adminUserExists: false,
        issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendedAction: 'manual_intervention'
      };
    }
  }

  /**
   * Validates all converted leads and returns those with issues
   */
  static async validateAllConvertedLeads(): Promise<{
    validLeads: Lead[];
    invalidLeads: Array<{ lead: Lead; validation: ConversionValidationResult }>;
  }> {
    try {
      // Get all converted leads
      const { data: convertedLeads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'converted');

      if (error) {
        throw new Error(`Error fetching converted leads: ${error.message}`);
      }

      const validLeads: Lead[] = [];
      const invalidLeads: Array<{ lead: Lead; validation: ConversionValidationResult }> = [];

      // Validate each converted lead - cast database leads to proper Lead type
      for (const dbLead of convertedLeads || []) {
        // Cast the database lead to proper Lead type with type assertions
        const lead: Lead = {
          ...dbLead,
          status: dbLead.status as Lead['status'],
          priority: (dbLead.priority as Lead['priority']) || 'medium',
          qualification_score: dbLead.qualification_score || 0,
          created_at: dbLead.created_at || new Date().toISOString(),
          updated_at: dbLead.updated_at || new Date().toISOString(),
          contact_name: dbLead.contact_name || '',
          email: dbLead.email || ''
        };
        
        const validation = await this.validateConvertedLead(lead);
        
        if (validation.isValid) {
          validLeads.push(lead);
        } else {
          invalidLeads.push({ lead, validation });
        }
      }

      return { validLeads, invalidLeads };
    } catch (error) {
      console.error('Error validating all converted leads:', error);
      throw error;
    }
  }

  /**
   * Attempts to fix a lead with conversion issues
   */
  static async fixLeadConversion(
    lead: Lead, 
    validation: ConversionValidationResult,
    action: 'revert_status' | 'retry_conversion'
  ): Promise<{ success: boolean; message: string }> {
    try {
      switch (action) {
        case 'revert_status':
          // Revert lead status back to qualified
          const { error: updateError } = await supabase
            .from('leads')
            .update({
              status: 'qualified',
              converted_tenant_id: null,
              converted_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', lead.id);

          if (updateError) {
            throw new Error(`Failed to revert lead status: ${updateError.message}`);
          }

          return {
            success: true,
            message: 'Lead status reverted to qualified successfully'
          };

        case 'retry_conversion':
          // This would trigger the conversion process again
          // For now, we'll just mark it for manual intervention
          const { error: notesError } = await supabase
            .from('leads')
            .update({
              notes: `${lead.notes || ''}\n\n[SYSTEM] Conversion retry needed - tenant incomplete. Issues: ${validation.issues.join(', ')}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', lead.id);

          if (notesError) {
            throw new Error(`Failed to update lead notes: ${notesError.message}`);
          }

          return {
            success: true,
            message: 'Lead marked for conversion retry - manual intervention required'
          };

        default:
          return {
            success: false,
            message: 'Unknown action specified'
          };
      }
    } catch (error) {
      console.error('Error fixing lead conversion:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
