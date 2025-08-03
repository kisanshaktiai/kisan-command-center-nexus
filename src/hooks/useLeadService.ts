
import { useState } from 'react';
import { LeadService } from '@/services/LeadService';
import { useNotifications } from './useNotifications';
import type { Lead } from '@/types/leads';

interface CreateLeadData {
  // Updated to use new tenant-aligned field names
  name: string; // was organization_name
  owner_name: string; // was contact_name  
  owner_email: string; // was email
  owner_phone?: string; // was phone
  type?: string; // was organization_type
  
  // Additional tenant fields that can be collected during lead creation
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

export const useLeadService = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const getLeads = async () => {
    setIsLoading(true);
    try {
      const result = await LeadService.getLeads();
      if (!result.success) {
        showError('Failed to fetch leads', { description: result.error });
        return null;
      }
      return result.data || [];
    } catch (error) {
      showError('Error fetching leads');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const createLead = async (leadData: CreateLeadData) => {
    setIsLoading(true);
    try {
      const result = await LeadService.createLead(leadData);
      if (!result.success) {
        showError('Failed to create lead', { description: result.error });
        return null;
      }
      showSuccess('Lead created successfully');
      return result.data;
    } catch (error) {
      showError('Error creating lead');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateLead = async (leadId: string, updateData: UpdateLeadData) => {
    setIsLoading(true);
    try {
      const result = await LeadService.updateLead(leadId, updateData);
      if (!result.success) {
        showError('Failed to update lead', { description: result.error });
        return null;
      }
      showSuccess('Lead updated successfully');
      return result.data;
    } catch (error) {
      showError('Error updating lead');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const assignLead = async (assignData: AssignLeadData) => {
    setIsLoading(true);
    try {
      const result = await LeadService.assignLead(assignData);
      if (!result.success) {
        showError('Failed to assign lead', { description: result.error });
        return false;
      }
      showSuccess('Lead assigned successfully');
      return true;
    } catch (error) {
      showError('Error assigning lead');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const convertToTenant = async (convertData: ConvertToTenantData) => {
    setIsLoading(true);
    try {
      const result = await LeadService.convertToTenant(convertData);
      if (!result.success) {
        showError('Failed to convert lead', { description: result.error });
        return null;
      }
      showSuccess('Lead converted to tenant successfully');
      return result.data;
    } catch (error) {
      showError('Error converting lead');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getAdminUsers = async () => {
    try {
      const result = await LeadService.getAdminUsers();
      if (!result.success) {
        showError('Failed to fetch admin users', { description: result.error });
        return [];
      }
      return result.data || [];
    } catch (error) {
      showError('Error fetching admin users');
      return [];
    }
  };

  return {
    isLoading,
    getLeads,
    createLead,
    updateLead,
    assignLead,
    convertToTenant,
    getAdminUsers,
  };
};
