
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
      
      // Query using the actual database column names, but map to new interface
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          organization_name,
          contact_name,
          email,
          phone,
          organization_type,
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
          let assignedAdmin = null;
          if (lead.assigned_to) {
            const { data: adminData } = await supabase
              .from('admin_users')
              .select('full_name, email')
              .eq('id', lead.assigned_to)
              .single();
            
            assignedAdmin = adminData || null;
          }
          
          // Map database fields to new interface with proper type casting
          return {
            ...lead,
            // Map old field names to new ones
            name: lead.organization_name || '',
            owner_name: lead.contact_name || '',
            owner_email: lead.email || '',
            owner_phone: lead.phone,
            type: lead.organization_type,
            // Ensure status is properly typed
            status: (lead.status as Lead['status']) || 'new',
            priority: (lead.priority as Lead['priority']) || 'medium',
            // Cast metadata properly
            metadata: (lead.metadata as Record<string, any>) || {},
            assigned_admin: assignedAdmin
          } as Lead;
        })
      );

      return leadsWithAdmins;
    }, 'getLeads');
  }

  async createLead(leadData: CreateLeadData): Promise<ServiceResult<Lead>> {
    return this.executeOperation(async () => {
      console.log('Creating lead:', leadData);
      
      // Map new field names to database column names
      const { data, error } = await supabase
        .from('leads')
        .insert({
          // Map new field names to database columns
          organization_name: leadData.name,
          contact_name: leadData.owner_name,
          email: leadData.owner_email,
          phone: leadData.owner_phone,
          organization_type: leadData.type || 'agri_company',
          
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
      
      // Map the returned data to new interface with proper type casting
      const mappedLead: Lead = {
        ...data,
        name: data.organization_name || '',
        owner_name: data.contact_name || '',
        owner_email: data.email || '',
        owner_phone: data.phone,
        type: data.organization_type,
        status: (data.status as Lead['status']) || 'new',
        priority: (data.priority as Lead['priority']) || 'medium',
        metadata: (data.metadata as Record<string, any>) || {},
        assigned_admin: null
      };
      
      return mappedLead;
    }, 'createLead');
  }

  async updateLead(leadId: string, updateData: UpdateLeadData): Promise<ServiceResult<Lead>> {
    return this.executeOperation(async () => {
      console.log('LeadService: Updating lead:', { leadId, updateData });
      
      // Map new field names to database column names for update
      const dbUpdateData: any = {
        updated_at: new Date().toISOString()
      };

      // Map the interface fields to database columns
      if (updateData.name !== undefined) dbUpdateData.organization_name = updateData.name;
      if (updateData.owner_name !== undefined) dbUpdateData.contact_name = updateData.owner_name;
      if (updateData.owner_email !== undefined) dbUpdateData.email = updateData.owner_email;
      if (updateData.owner_phone !== undefined) dbUpdateData.phone = updateData.owner_phone;
      if (updateData.type !== undefined) dbUpdateData.organization_type = updateData.type;

      // Direct field mappings
      if (updateData.business_registration !== undefined) dbUpdateData.business_registration = updateData.business_registration;
      if (updateData.business_address !== undefined) dbUpdateData.business_address = updateData.business_address;
      if (updateData.established_date !== undefined) dbUpdateData.established_date = updateData.established_date;
      if (updateData.slug !== undefined) dbUpdateData.slug = updateData.slug;
      if (updateData.subscription_plan !== undefined) dbUpdateData.subscription_plan = updateData.subscription_plan;
      if (updateData.subdomain !== undefined) dbUpdateData.subdomain = updateData.subdomain;
      if (updateData.custom_domain !== undefined) dbUpdateData.custom_domain = updateData.custom_domain;
      if (updateData.status !== undefined) dbUpdateData.status = updateData.status;
      if (updateData.priority !== undefined) dbUpdateData.priority = updateData.priority;
      if (updateData.notes !== undefined) dbUpdateData.notes = updateData.notes;
      if (updateData.qualification_score !== undefined) dbUpdateData.qualification_score = updateData.qualification_score;
      if (updateData.last_contact_at !== undefined) dbUpdateData.last_contact_at = updateData.last_contact_at;

      // Remove undefined values to prevent database errors
      Object.keys(dbUpdateData).forEach(key => {
        if (dbUpdateData[key] === undefined) {
          delete dbUpdateData[key];
        }
      });

      console.log('LeadService: Update payload prepared:', dbUpdateData);

      const { data, error } = await supabase
        .from('leads')
        .update(dbUpdateData)
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
          dbUpdateData
        });
        throw error;
      }

      if (!data) {
        console.error('LeadService: No data returned from update');
        throw new Error('No data returned from update operation');
      }
      
      console.log('LeadService: Lead updated successfully:', data);
      
      // Map the returned data to new interface with proper type casting
      const mappedLead: Lead = {
        ...data,
        name: data.organization_name || '',
        owner_name: data.contact_name || '',
        owner_email: data.email || '',
        owner_phone: data.phone,
        type: data.organization_type,
        status: (data.status as Lead['status']) || 'new',
        priority: (data.priority as Lead['priority']) || 'medium',
        metadata: (data.metadata as Record<string, any>) || {},
        assigned_admin: null
      };
      
      return mappedLead;
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

      // Handle the RPC result properly with type checking
      const result = rpcResult as any;

      if (!result || (typeof result === 'object' && result.success === false)) {
        console.error('Conversion failed:', result);
        const errorMessage = typeof result === 'object' && result.error ? result.error : 'Conversion failed';
        throw new Error(errorMessage);
      }

      // Extract tenant ID from the result with proper type checking
      let tenantId: string | null = null;
      let invitationToken: string | null = null;

      if (typeof result === 'object' && result !== null) {
        tenantId = (result as any).tenant_id || null;
        invitationToken = (result as any).invitation_token || null;
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
