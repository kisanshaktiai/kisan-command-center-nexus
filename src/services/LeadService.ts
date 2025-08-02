import { BaseService, ServiceResult } from './BaseService';
import { supabase } from '@/integrations/supabase/client';
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

  // Make constructor public to fix the createInstance issue
  constructor() {
    super();
  }

  static getInstance(): LeadServiceClass {
    if (!this.instanceStorage.instance) {
      this.instanceStorage.instance = new LeadServiceClass();
    }
    return this.instanceStorage.instance;
  }

  async getLeads(): Promise<ServiceResult<Lead[]>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          assigned_admin:admin_users(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Lead[];
    }, 'getLeads');
  }

  async createLead(leadData: CreateLeadData): Promise<ServiceResult<Lead>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          contact_name: leadData.contact_name,
          email: leadData.email,
          phone: leadData.phone,
          organization_name: leadData.organization_name,
          source: leadData.source,
          priority: leadData.priority || 'medium',
          notes: leadData.notes,
          status: 'new',
          qualification_score: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Lead;
    }, 'createLead');
  }

  async updateLead(leadId: string, updateData: UpdateLeadData): Promise<ServiceResult<Lead>> {
    return this.executeOperation(async () => {
      const updatePayload: any = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      // Set specific timestamps based on status
      if (updateData.status === 'contacted') {
        updatePayload.last_contact_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data as Lead;
    }, 'updateLead');
  }

  async assignLead(assignData: AssignLeadData): Promise<ServiceResult<boolean>> {
    return this.executeOperation(async () => {
      const { error } = await supabase.rpc('reassign_lead', {
        p_lead_id: assignData.leadId,
        p_new_admin_id: assignData.adminId,
        p_reason: assignData.reason,
      });

      if (error) throw error;
      return true;
    }, 'assignLead');
  }

  async convertToTenant(convertData: ConvertToTenantData): Promise<ServiceResult<any>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase.rpc('convert_lead_to_tenant', {
        p_lead_id: convertData.leadId,
        p_tenant_name: convertData.tenantName,
        p_tenant_slug: convertData.tenantSlug,
        p_subscription_plan: convertData.subscriptionPlan,
        p_admin_email: convertData.adminEmail,
        p_admin_name: convertData.adminName,
      });

      if (error) throw error;
      return data;
    }, 'convertToTenant');
  }

  async getAdminUsers(): Promise<ServiceResult<any[]>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, full_name, email')
        .eq('is_active', true);

      if (error) throw error;
      return data;
    }, 'getAdminUsers');
  }
}

export const LeadService = LeadServiceClass.getInstance();
