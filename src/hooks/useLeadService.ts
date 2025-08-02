
import { useState } from 'react';
import { LeadService } from '@/services/LeadService';
import { useNotifications } from './useNotifications';
import type { Lead } from '@/types/leads';

interface CreateLeadData {
  contact_name: string;
  email: string;
  phone?: string;
  organization_name?: string; // Changed from company_name
  source?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
}

interface UpdateLeadData {
  contact_name?: string;
  email?: string;
  phone?: string;
  organization_name?: string; // Changed from company_name
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
