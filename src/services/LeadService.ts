
import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';
import type { Lead } from '@/types/leads';

interface CreateLeadData {
  contact_name: string;
  email: string;
  phone?: string;
  organization_name?: string;
  organization_type?: string;
  source?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
}

interface UpdateLeadData {
  contact_name?: string;
  email?: string;
  phone?: string;
  organization_name?: string;
  organization_type?: string;
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

// Database row type for leads table
interface LeadRow {
  id: string;
  contact_name: string;
  email: string;
  phone?: string;
  organization_name?: string;
  organization_type?: string;
  assigned_to?: string;
  assigned_at?: string;
  status: string; // Database returns string, we'll cast to proper type
  priority: string;
  source?: string;
  qualification_score: number;
  converted_tenant_id?: string;
  converted_at?: string;
  rejection_reason?: string;
  last_contact_at?: string;
  next_follow_up_at?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  lead_score?: number;
  marketing_qualified?: boolean;
  sales_qualified?: boolean;
  demo_scheduled?: boolean;
  proposal_sent?: boolean;
  contract_sent?: boolean;
  last_activity?: string;
  created_by?: string;
  ai_score?: number;
  ai_recommended_action?: string;
  source_id?: string;
  campaign_id?: string;
}

export class LeadService extends BaseService {
  // Helper method to convert database row to Lead type
  private static convertRowToLead(row: LeadRow): Lead {
    return {
      ...row,
      status: row.status as Lead['status'],
      priority: row.priority as Lead['priority'],
    };
  }

  static async getLeads(): Promise<ServiceResult<Lead[]>> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('LeadService: Error fetching leads:', error);
        throw new Error(`Failed to fetch leads: ${error.message}`);
      }

      const leads = data ? data.map(row => this.convertRowToLead(row as LeadRow)) : [];
      console.log('LeadService: Successfully fetched leads:', leads.length);
      return { success: true, data: leads };
    } catch (error) {
      console.error('LeadService: Unexpected error fetching leads:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error while fetching leads';
      return { success: false, error: errorMessage };
    }
  }

  static async createLead(leadData: CreateLeadData): Promise<ServiceResult<Lead>> {
    try {
      console.log('LeadService: Creating lead with data:', leadData);

      // Prepare data for database with proper defaults
      const insertData = {
        contact_name: leadData.contact_name,
        email: leadData.email,
        phone: leadData.phone,
        organization_name: leadData.organization_name || '',
        organization_type: leadData.organization_type || 'company',
        source: leadData.source,
        priority: leadData.priority || 'medium',
        notes: leadData.notes,
        status: 'new',
        qualification_score: 0
      };

      const { data, error } = await supabase
        .from('leads')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('LeadService: Error creating lead:', error);
        throw new Error(`Failed to create lead: ${error.message}`);
      }

      const lead = this.convertRowToLead(data as LeadRow);
      console.log('LeadService: Successfully created lead:', lead.id);
      return { success: true, data: lead };
    } catch (error) {
      console.error('LeadService: Unexpected error creating lead:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error while creating lead';
      return { success: false, error: errorMessage };
    }
  }

  static async updateLead(leadId: string, updateData: UpdateLeadData): Promise<ServiceResult<Lead>> {
    try {
      console.log('LeadService: Updating lead:', leadId, updateData);

      if (!leadId) {
        throw new Error('Lead ID is required');
      }

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
        throw new Error(`Failed to update lead: ${error.message}`);
      }

      if (!data) {
        console.error('LeadService: No data returned from update');
        throw new Error('Update operation failed - no data returned');
      }

      const lead = this.convertRowToLead(data as LeadRow);
      console.log('LeadService: Successfully updated lead:', lead.id);
      return { success: true, data: lead };
    } catch (error) {
      console.error('LeadService: Unexpected error updating lead:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error while updating lead';
      return { success: false, error: errorMessage };
    }
  }

  static async assignLead(assignData: AssignLeadData): Promise<ServiceResult<boolean>> {
    try {
      console.log('LeadService: Assigning lead:', assignData);

      const { leadId, adminId, reason } = assignData;

      if (!leadId || !adminId) {
        throw new Error('Lead ID and Admin ID are required');
      }

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
        throw new Error(`Failed to assign lead: ${updateError.message}`);
      }

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
      }

      console.log('LeadService: Successfully assigned lead:', leadId, 'to:', adminId);
      return { success: true, data: true };
    } catch (error) {
      console.error('LeadService: Unexpected error assigning lead:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error while assigning lead';
      return { success: false, error: errorMessage };
    }
  }

  static async convertToTenant(convertData: ConvertToTenantData): Promise<ServiceResult<ConversionResult>> {
    const maxRetries = 3;
    const retryDelay = 1000;

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
          
          if (attempt < maxRetries && this.isRetryableError(error)) {
            console.log(`LeadService: Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            continue;
          }
          
          throw new Error(`Failed to convert lead to tenant: ${error.message || 'Unknown error'}`);
        }

        if (!data || !data.success) {
          const errorMessage = data?.error || 'Conversion failed without specific error';
          console.error(`LeadService: Conversion failed (attempt ${attempt}):`, errorMessage);
          
          if (attempt < maxRetries && !data?.error?.includes('already taken') && !data?.error?.includes('not found')) {
            console.log(`LeadService: Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            continue;
          }
          
          throw new Error(errorMessage);
        }

        console.log('LeadService: Successfully converted lead to tenant:', data.tenant_id);
        return { success: true, data };

      } catch (error) {
        console.error(`LeadService: Unexpected error converting lead (attempt ${attempt}):`, error);
        
        if (attempt < maxRetries) {
          console.log(`LeadService: Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }
        
        const errorMessage = error instanceof Error ? error.message : 'Unexpected error while converting lead to tenant';
        return { success: false, error: errorMessage };
      }
    }

    return { success: false, error: 'Failed to convert lead after multiple attempts' };
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
        throw new Error(`Failed to fetch admin users: ${error.message}`);
      }

      console.log('LeadService: Successfully fetched admin users:', data?.length || 0);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('LeadService: Unexpected error fetching admin users:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error while fetching admin users';
      return { success: false, error: errorMessage };
    }
  }

  private static isRetryableError(error: any): boolean {
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
