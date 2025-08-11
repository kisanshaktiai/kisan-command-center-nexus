
import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LeadConversionValidator } from '@/services/LeadConversionValidator';
import { useNotifications } from './useNotifications';
import type { Lead } from '@/types/leads';

export const useLeadValidationWatcher = (leads: Lead[]) => {
  const { showWarning } = useNotifications();

  const { data: invalidLeads } = useQuery({
    queryKey: ['lead-validation', leads.length],
    queryFn: async () => {
      const convertedLeads = leads.filter(lead => lead.status === 'converted');
      
      if (convertedLeads.length === 0) return [];

      const invalidLeads = [];
      
      for (const lead of convertedLeads) {
        const validation = await LeadConversionValidator.validateConvertedLead(lead);
        if (!validation.isValid) {
          invalidLeads.push({ lead, validation });
        }
      }
      
      return invalidLeads;
    },
    enabled: leads.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  // Show notification when invalid conversions are detected
  useEffect(() => {
    if (invalidLeads && invalidLeads.length > 0) {
      showWarning(
        `Found ${invalidLeads.length} invalid converted lead${invalidLeads.length !== 1 ? 's' : ''}`,
        {
          description: 'Some converted leads may have incomplete tenant setup. Check the Conversion Validator tab.',
        }
      );
    }
  }, [invalidLeads, showWarning]);

  return {
    invalidConversions: invalidLeads || [],
    hasInvalidConversions: (invalidLeads?.length || 0) > 0
  };
};
