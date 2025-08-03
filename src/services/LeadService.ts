
import { BaseService, ServiceResult } from './BaseService';
import { supabase } from '@/integrations/supabase/client';
import type { Lead } from '@/types/leads';

interface CreateLeadData {
  // Updated to use new tenant-aligned field names
  name: string; // was organization_name
  owner_name: string; // was contact_name  
  owner_email: string; // was email
  owner_phone?: string; // was phone
  type?: string; // was organization_type
  
  // Additional tenant fields
  business_registration?: string;
  business_address?: any;
  established_date?: string;
  slug?: string;
  subscription_plan?: string;
  subdomain?: string;
  custom_domain?: string;
  
  // Standard lead fields
  source?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
}

interface UpdateLeadData {
  // Updated field names
  name?: string; // was organization_name
  owner_name?: string; // was contact_name
  owner_email?: string; // was email
  owner_phone?: string; // was phone
  type?: string; // was organization_type
  
  // Additional tenant fields
  business_registration?: string;
  business_address?: any;
  established_date?: string;
  slug?: string;
  subscription_plan?: string;
  subdomain?: string;
  custom_domain?: string;
  
  // Standard lead fields
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
  tenantName?: string; // Optional override for lead.name
  tenantSlug?: string; // Optional override for lead.slug
  subscriptionPlan?: string;
  adminEmail?: string; // Optional override for lead.owner_email
  adminName?: string; // Optional override for lead.owner_name
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
      
      // Updated query to use new tenant-aligned field names
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          name,
          owner_name,
          owner_email,
          owner_phone,
          type,
          business_registration,
          business_address,
          established_date,
          slug,
          subscription_plan,
          subscription_start_date,
          subscription_end_date,
          trial_ends_at,
          max_farmers,
          max_dealers,
          max_products,
          max_storage_gb,
          max_api_calls_per_day,
          subdomain,
          custom_domain,
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
          metadata
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
        leadsData.map(async (lead: any) => {
          if (lead.assigned_to) {
            const { data: adminData } = await supabase
              .from('admin_users')
              .select('full_name, email')
              .eq('id', lead.assigned_to)
              .single();
            
            return {
              ...lead,
              assigned_admin: adminData || null
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
          // Use new tenant-aligned field names
          name: leadData.name,
          owner_name: leadData.owner_name,
          owner_email: leadData.owner_email,
          owner_phone: leadData.owner_phone,
          type: leadData.type || 'agri_company',
          
          // Additional tenant fields
          business_registration: leadData.business_registration,
          business_address: leadData.business_address,
          established_date: leadData.established_date,
          slug: leadData.slug,
          subscription_plan: leadData.subscription_plan || 'Kisan_Basic',
          subdomain: leadData.subdomain,
          custom_domain: leadData.custom_domain,
          
          // Standard lead fields
          source: leadData.source,
          priority: leadData.priority || 'medium',
          notes: leadData.notes,
          status: 'new',
          qualification_score: 0,
          lead_score: 0,
          metadata: {}
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
      
      // Call the updated RPC function with direct field mapping
      const { data: rpcResult, error } = await supabase.rpc('convert_lead_to_tenant', {
        p_lead_id: convertData.leadId,
        p_tenant_name: convertData.tenantName, // Optional override
        p_tenant_slug: convertData.tenantSlug, // Optional override
        p_subscription_plan: convertData.subscriptionPlan,
        p_admin_email: convertData.adminEmail, // Optional override
        p_admin_name: convertData.adminName, // Optional override
      });

      if (error) {
        console.error('Error converting lead to tenant:', error);
        throw error;
      }

      console.log('RPC conversion result:', rpcResult);

      // Handle the RPC result properly
      const result = rpcResult as any;

      if (!result || (typeof result === 'object' && result.success === false)) {
        console.error('Conversion failed:', result);
        const errorMessage = typeof result === 'object' && result.error ? result.error : 'Conversion failed';
        throw new Error(errorMessage);
      }

      // Extract tenant ID from the result
      let tenantId: string | null = null;
      let invitationToken: string | null = null;

      if (typeof result === 'object') {
        tenantId = result.tenant_id || null;
        invitationToken = result.invitation_token || null;
      }
      
      if (!tenantId) {
        console.error('No tenant ID returned from conversion');
        throw new Error('Failed to get tenant ID from conversion result');
      }

      // Send conversion email with account details
      try {
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('tenant-conversion-email', {
          body: {
            leadId: convertData.leadId,
            tenantId: tenantId,
            invitationToken: invitationToken
          }
        });

        if (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't throw error here - tenant was created successfully
        } else {
          console.log('Conversion email sent successfully');
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't throw error here - tenant was created successfully
      }

      return {
        tenant_id: tenantId,
        invitation_token: invitationToken,
        emailSent: true // We'll assume success for now
      };
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
