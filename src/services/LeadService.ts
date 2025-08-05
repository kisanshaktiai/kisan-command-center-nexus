import { BaseService, ServiceResult } from './BaseService';
import { supabase } from '@/integrations/supabase/client';
import type { Lead, CustomFieldValue } from '@/types/leads';

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

class LeadServiceClass extends BaseService {
  private static instanceStorage: { instance?: LeadServiceClass } = {};

  // Updated valid status values to include 'converted'
  private readonly VALID_STATUSES = ['new', 'assigned', 'contacted', 'qualified', 'converted', 'rejected'] as const;
  private readonly VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

  constructor() {
    super();
  }

  static getInstance(): LeadServiceClass {
    if (!this.instanceStorage.instance) {
      this.instanceStorage.instance = new LeadServiceClass();
    }
    return this.instanceStorage.instance;
  }

  private validateStatus(status: string): status is Lead['status'] {
    return this.VALID_STATUSES.includes(status as any);
  }

  private validatePriority(priority: string): priority is Lead['priority'] {
    return this.VALID_PRIORITIES.includes(priority as any);
  }

  private transformDbRowToLead(dbRow: any): Lead {
    // Transform custom_fields from JSON to CustomFieldValue[]
    const customFields: CustomFieldValue[] = Array.isArray(dbRow.custom_fields) 
      ? dbRow.custom_fields.map((field: any) => ({
          field_name: field.field_name || '',
          field_type: field.field_type || 'text',
          value: field.value || '',
          label: field.label || field.field_name || ''
        }))
      : [];

    return {
      ...dbRow,
      status: this.validateStatus(dbRow.status) ? dbRow.status as Lead['status'] : 'new',
      priority: this.validatePriority(dbRow.priority) ? dbRow.priority as Lead['priority'] : 'medium',
      custom_fields: customFields,
      assigned_admin: dbRow.assigned_admin || null
    } as Lead;
  }

  async getLeads(): Promise<ServiceResult<Lead[]>> {
    return this.executeOperation(async () => {
      console.log('Fetching leads from database...');
      
      // Use only fields that exist in the database - simplified query
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          contact_name,
          email,
          phone,
          organization_name,
          organization_type,
          assigned_to,
          assigned_at,
          status,
          priority,
          source,
          qualification_score,
          converted_tenant_id,
          converted_at,
          rejection_reason,
          last_contact_at,
          next_follow_up_at,
          created_at,
          updated_at,
          notes,
          lead_score,
          marketing_qualified,
          sales_qualified,
          demo_scheduled,
          proposal_sent,
          contract_sent,
          last_activity,
          created_by,
          ai_score,
          ai_recommended_action,
          source_id,
          campaign_id,
          custom_fields
        `)
        .order('created_at', { ascending: false });

      if (leadsError) {
        console.error('Error fetching leads:', leadsError);
        throw leadsError;
      }

      if (!leadsData) {
        console.log('No leads data returned');
        return [];
      }

      console.log('Leads fetched successfully:', leadsData.length);

      // Get admin users data for assigned leads
      const leadsWithAdmins = await Promise.all(
        leadsData.map(async (lead) => {
          if (lead.assigned_to) {
            const { data: adminData } = await supabase
              .from('admin_users')
              .select('full_name, email')
              .eq('id', lead.assigned_to)
              .single();
            
            return this.transformDbRowToLead({
              ...lead,
              assigned_admin: adminData || null
            });
          }
          return this.transformDbRowToLead({
            ...lead,
            assigned_admin: null
          });
        })
      );

      return leadsWithAdmins;
    }, 'getLeads');
  }

  async createLead(leadData: CreateLeadData): Promise<ServiceResult<Lead>> {
    return this.executeOperation(async () => {
      console.log('Creating lead:', leadData);
      
      // Validate priority before inserting
      const priority = leadData.priority || 'medium';
      if (!this.validatePriority(priority)) {
        throw new Error(`Invalid priority: ${priority}. Valid priorities are: ${this.VALID_PRIORITIES.join(', ')}`);
      }
      
      const { data, error } = await supabase
        .from('leads')
        .insert({
          contact_name: leadData.contact_name,
          email: leadData.email,
          phone: leadData.phone,
          organization_name: leadData.organization_name,
          organization_type: 'company',
          source: leadData.source,
          priority: priority,
          notes: leadData.notes,
          status: 'new',
          qualification_score: 0,
          lead_score: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating lead:', error);
        throw error;
      }
      
      console.log('Lead created successfully:', data);
      return this.transformDbRowToLead({
        ...data,
        assigned_admin: null
      });
    }, 'createLead');
  }

  async updateLead(leadId: string, updateData: UpdateLeadData): Promise<ServiceResult<Lead>> {
    return this.executeOperation(async () => {
      console.log('LeadService: Updating lead:', { leadId, updateData });
      
      // Validate status if provided
      if (updateData.status) {
        if (!this.validateStatus(updateData.status)) {
          throw new Error(`Invalid status: ${updateData.status}. Valid statuses are: ${this.VALID_STATUSES.join(', ')}`);
        }
      }

      // Validate priority if provided
      if (updateData.priority && !this.validatePriority(updateData.priority)) {
        throw new Error(`Invalid priority: ${updateData.priority}. Valid priorities are: ${this.VALID_PRIORITIES.join(', ')}`);
      }
      
      const updatePayload: any = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      // Remove undefined values to prevent database errors
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key];
        }
      });

      console.log('LeadService: Update payload prepared:', updatePayload);

      const { data, error } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', leadId)
        .select()
        .single();

      if (error) {
        console.error('LeadService: Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          leadId,
          updatePayload
        });
        throw error;
      }

      if (!data) {
        console.error('LeadService: No data returned from update');
        throw new Error('No data returned from update operation');
      }
      
      console.log('LeadService: Lead updated successfully:', data);
      return this.transformDbRowToLead({
        ...data,
        assigned_admin: null // Will be populated by calling code if needed
      });
    }, 'updateLead');
  }

  async assignLead(assignData: AssignLeadData): Promise<ServiceResult<boolean>> {
    return this.executeOperation(async () => {
      console.log('Assigning lead:', assignData);
      
      const { error } = await supabase.rpc('reassign_lead', {
        p_lead_id: assignData.leadId,
        p_new_admin_id: assignData.adminId,
        p_reason: assignData.reason,
      });

      if (error) {
        console.error('Error assigning lead:', error);
        throw error;
      }
      
      console.log('Lead assigned successfully');
      return true;
    }, 'assignLead');
  }

  async convertToTenant(convertData: ConvertToTenantData): Promise<ServiceResult<any>> {
    return this.executeOperation(async () => {
      console.log('Converting lead to tenant:', convertData);
      
      // Use the edge function for conversion
      const { data, error } = await supabase.functions.invoke('convert-lead-to-tenant', {
        body: convertData,
      });

      if (error) {
        console.error('Error converting lead to tenant:', error);
        throw error;
      }

      console.log('Lead conversion successful:', data);
      return data;
    }, 'convertToTenant');
  }

  async getAdminUsers(): Promise<ServiceResult<any[]>> {
    return this.executeOperation(async () => {
      console.log('Fetching admin users...');
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, full_name, email')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching admin users:', error);
        throw error;
      }
      
      console.log('Admin users fetched:', data?.length || 0);
      return data;
    }, 'getAdminUsers');
  }
}

export const LeadService = LeadServiceClass.getInstance();
