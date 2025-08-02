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
      console.log('Fetching leads from database...');
      
      // First get the leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadsError) {
        console.error('Error fetching leads:', leadsError);
        throw leadsError;
      }

      console.log('Leads fetched successfully:', leadsData?.length || 0);

      // Then get admin users data separately if needed
      const leadsWithAdmins = await Promise.all(
        leadsData.map(async (lead) => {
          if (lead.assigned_to) {
            const { data: adminData } = await supabase
              .from('admin_users')
              .select('full_name, email')
              .eq('id', lead.assigned_to)
              .single();
            
            return {
              ...lead,
              assigned_admin: adminData
            };
          }
          return {
            ...lead,
            assigned_admin: null
          };
        })
      );

      return leadsWithAdmins as Lead[];
    }, 'getLeads');
  }

  async createLead(leadData: CreateLeadData): Promise<ServiceResult<Lead>> {
    return this.executeOperation(async () => {
      console.log('Creating lead:', leadData);
      
      const { data, error } = await supabase
        .from('leads')
        .insert({
          contact_name: leadData.contact_name,
          email: leadData.email,
          phone: leadData.phone,
          organization_name: leadData.organization_name,
          organization_type: 'company',
          source: leadData.source,
          priority: leadData.priority || 'medium',
          notes: leadData.notes,
          status: 'new',
          qualification_score: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating lead:', error);
        throw error;
      }
      
      console.log('Lead created successfully:', data);
      return data as Lead;
    }, 'createLead');
  }

  async updateLead(leadId: string, updateData: UpdateLeadData): Promise<ServiceResult<Lead>> {
    return this.executeOperation(async () => {
      console.log('LeadService: Updating lead:', { leadId, updateData });
      
      const updatePayload: any = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      if (updateData.status === 'contacted') {
        updatePayload.last_contact_at = new Date().toISOString();
      }

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
      return data as Lead;
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
      
      // Generate a temporary password
      const tempPassword = this.generateTempPassword();
      
      // Call the updated RPC function to create tenant
      const { data: rpcResult, error } = await supabase.rpc('convert_lead_to_tenant', {
        p_lead_id: convertData.leadId,
        p_tenant_name: convertData.tenantName,
        p_tenant_slug: convertData.tenantSlug,
        p_subscription_plan: convertData.subscriptionPlan,
        p_admin_email: convertData.adminEmail,
        p_admin_name: convertData.adminName,
      });

      if (error) {
        console.error('Error converting lead to tenant:', error);
        throw error;
      }

      console.log('RPC conversion result:', rpcResult);

      // Extract tenant ID from the result
      let tenantId: string | null = null;
      
      if (rpcResult && typeof rpcResult === 'object' && 'tenant_id' in rpcResult) {
        tenantId = String(rpcResult.tenant_id);
      }
      
      if (!tenantId) {
        console.error('No tenant ID returned from conversion');
        throw new Error('Failed to get tenant ID from conversion result');
      }

      // Send conversion email with account details
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('tenant-conversion-email', {
        body: {
          leadId: convertData.leadId,
          tenantId: tenantId,
          adminEmail: convertData.adminEmail || '',
          adminName: convertData.adminName || '',
          tenantName: convertData.tenantName,
          tempPassword: tempPassword
        }
      });

      if (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't throw error here - tenant was created successfully
      } else {
        console.log('Conversion email sent successfully');
      }

      return {
        tenant_id: tenantId,
        emailSent: !emailError,
        tempPassword: tempPassword // Include for admin reference
      };
    }, 'convertToTenant');
  }

  private generateTempPassword(): string {
    // Generate a secure temporary password
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // special
    
    // Fill the rest
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
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
