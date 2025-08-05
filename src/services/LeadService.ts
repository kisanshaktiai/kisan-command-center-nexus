
import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';
import type { Lead } from '@/types/leads';

interface CreateLeadData {
  contact_name: string;
  email: string;
  phone?: string;
  organization_name?: string;
  source?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
}

interface UpdateLeadData {
  contact_name?: string;
  email?: string;
  phone?: string;
  organization_name?: string;
  status?: Lead['status'];
  priority?: Lead['priority'];
  notes?: string;
  qualification_score?: number;
  last_contact_at?: string;
}

interface AssignLeadData {
  leadId: string;
  adminId: string;
  reason?: string;
}

interface ConvertToTenantData {
  leadId: string;
  tenantName: string;
  tenantSlug: string;
  subscriptionPlan?: string;
  adminEmail?: string;
  adminName?: string;
}

interface ConversionResult {
  success: boolean;
  tenant_id?: string;
  tempPassword?: string;
  message?: string;
}

export class LeadService extends BaseService {
  static async getLeads(): Promise<ServiceResult<Lead[]>> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('LeadService: Error fetching leads:', error);
        return this.handleError(error, 'Failed to fetch leads');
      }

      console.log('LeadService: Successfully fetched leads:', data?.length || 0);
      return this.handleSuccess(data || []);
    } catch (error) {
      console.error('LeadService: Unexpected error fetching leads:', error);
      return this.handleError(error, 'Unexpected error while fetching leads');
    }
  }

  static async createLead(leadData: CreateLeadData): Promise<ServiceResult<Lead>> {
    try {
      console.log('LeadService: Creating lead with data:', leadData);

      const { data, error } = await supabase
        .from('leads')
        .insert(leadData)
        .select()
        .single();

      if (error) {
        console.error('LeadService: Error creating lead:', error);
        return this.handleError(error, 'Failed to create lead');
      }

      console.log('LeadService: Successfully created lead:', data.id);
      return this.handleSuccess(data);
    } catch (error) {
      console.error('LeadService: Unexpected error creating lead:', error);
      return this.handleError(error, 'Unexpected error while creating lead');
    }
  }

  static async updateLead(leadId: string, updateData: UpdateLeadData): Promise<ServiceResult<Lead>> {
    try {
      console.log('LeadService: Updating lead:', leadId, updateData);

      // Validate lead ID
      if (!leadId) {
        return this.handleError(new Error('Lead ID is required'), 'Lead ID is required');
      }

      // Prepare update data with timestamp
      const dataToUpdate = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('leads')
        .update(dataToUpdate)
        .eq('id', leadId)
        .select()
        .single();

      if (error) {
        console.error('LeadService: Error updating lead:', error);
        return this.handleError(error, 'Failed to update lead');
      }

      if (!data) {
        console.error('LeadService: No data returned from update');
        return this.handleError(new Error('No data returned'), 'Update operation failed');
      }

      console.log('LeadService: Successfully updated lead:', data.id);
      return this.handleSuccess(data);
    } catch (error) {
      console.error('LeadService: Unexpected error updating lead:', error);
      return this.handleError(error, 'Unexpected error while updating lead');
    }
  }

  static async assignLead(assignData: AssignLeadData): Promise<ServiceResult<boolean>> {
    try {
      console.log('LeadService: Assigning lead:', assignData);

      const { leadId, adminId, reason } = assignData;

      if (!leadId || !adminId) {
        return this.handleError(
          new Error('Lead ID and Admin ID are required'), 
          'Lead ID and Admin ID are required'
        );
      }

      // Update lead assignment
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          assigned_to: adminId,
          assigned_at: new Date().toISOString(),
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('LeadService: Error assigning lead:', updateError);
        return this.handleError(updateError, 'Failed to assign lead');
      }

      // Log the assignment
      const { error: logError } = await supabase
        .from('lead_assignments')
        .insert({
          lead_id: leadId,
          assigned_to: adminId,
          assignment_type: 'manual',
          assignment_reason: reason || 'Manual assignment'
        });

      if (logError) {
        console.warn('LeadService: Failed to log assignment:', logError);
        // Don't fail the operation for logging issues
      }

      console.log('LeadService: Successfully assigned lead:', leadId, 'to:', adminId);
      return this.handleSuccess(true);
    } catch (error) {
      console.error('LeadService: Unexpected error assigning lead:', error);
      return this.handleError(error, 'Unexpected error while assigning lead');
    }
  }

  static async convertToTenant(convertData: ConvertToTenantData): Promise<ServiceResult<ConversionResult>> {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`LeadService: Converting lead to tenant (attempt ${attempt}):`, {
          leadId: convertData.leadId,
          tenantName: convertData.tenantName,
          tenantSlug: convertData.tenantSlug,
          subscriptionPlan: convertData.subscriptionPlan
        });

        const { data, error } = await supabase.functions.invoke('convert-lead-to-tenant', {
          body: convertData,
        });

        if (error) {
          console.error(`LeadService: Edge function error (attempt ${attempt}):`, error);
          
          // Check if it's a network/connectivity issue that might benefit from retry
          if (attempt < maxRetries && this.isRetryableError(error)) {
            console.log(`LeadService: Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            continue;
          }
          
          return this.handleError(error, `Failed to convert lead to tenant: ${error.message || 'Unknown error'}`);
        }

        if (!data || !data.success) {
          const errorMessage = data?.error || 'Conversion failed without specific error';
          console.error(`LeadService: Conversion failed (attempt ${attempt}):`, errorMessage);
          
          if (attempt < maxRetries && !data?.error?.includes('already taken') && !data?.error?.includes('not found')) {
            console.log(`LeadService: Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            continue;
          }
          
          return this.handleError(new Error(errorMessage), errorMessage);
        }

        console.log('LeadService: Successfully converted lead to tenant:', data.tenant_id);
        return this.handleSuccess(data);

      } catch (error) {
        console.error(`LeadService: Unexpected error converting lead (attempt ${attempt}):`, error);
        
        if (attempt < maxRetries) {
          console.log(`LeadService: Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }
        
        return this.handleError(error, 'Unexpected error while converting lead to tenant');
      }
    }

    return this.handleError(
      new Error('Max retries exceeded'), 
      'Failed to convert lead after multiple attempts'
    );
  }

  static async getAdminUsers(): Promise<ServiceResult<any[]>> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, email, full_name, role, is_active')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('LeadService: Error fetching admin users:', error);
        return this.handleError(error, 'Failed to fetch admin users');
      }

      console.log('LeadService: Successfully fetched admin users:', data?.length || 0);
      return this.handleSuccess(data || []);
    } catch (error) {
      console.error('LeadService: Unexpected error fetching admin users:', error);
      return this.handleError(error, 'Unexpected error while fetching admin users');
    }
  }

  private static isRetryableError(error: any): boolean {
    // Check for network errors, timeout errors, or temporary server errors
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorStatus = error?.status;
    
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('fetch') ||
      errorStatus === 502 ||
      errorStatus === 503 ||
      errorStatus === 504
    );
  }
}
