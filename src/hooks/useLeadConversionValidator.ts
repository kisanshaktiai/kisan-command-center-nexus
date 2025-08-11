
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LeadConversionValidator, type ConversionValidationResult } from '@/services/LeadConversionValidator';
import { useNotifications } from './useNotifications';
import type { Lead } from '@/types/leads';

export const useLeadConversionValidator = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [validationResults, setValidationResults] = useState<Array<{
    lead: Lead;
    validation: ConversionValidationResult;
  }>>([]);
  
  const queryClient = useQueryClient();
  const { showSuccess, showError, showLoading, dismiss } = useNotifications();

  const validateSingleLead = useCallback(async (lead: Lead): Promise<ConversionValidationResult> => {
    try {
      return await LeadConversionValidator.validateConvertedLead(lead);
    } catch (error) {
      console.error('Error validating lead:', error);
      throw error;
    }
  }, []);

  const validateAllConvertedLeads = useCallback(async () => {
    setIsValidating(true);
    const loadingToast = showLoading('Validating all converted leads...');

    try {
      const { validLeads, invalidLeads } = await LeadConversionValidator.validateAllConvertedLeads();
      
      setValidationResults(invalidLeads);
      dismiss(loadingToast);

      if (invalidLeads.length === 0) {
        showSuccess('All converted leads are valid', {
          description: `Validated ${validLeads.length} converted leads - all look good!`
        });
      } else {
        showError(`Found ${invalidLeads.length} invalid converted leads`, {
          description: `${validLeads.length} are valid, ${invalidLeads.length} need attention`
        });
      }

      return { validLeads, invalidLeads };
    } catch (error) {
      dismiss(loadingToast);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Failed to validate converted leads', {
        description: errorMessage
      });
      throw error;
    } finally {
      setIsValidating(false);
    }
  }, [showSuccess, showError, showLoading, dismiss]);

  const fixLeadConversion = useCallback(async (
    lead: Lead,
    validation: ConversionValidationResult,
    action: 'revert_status' | 'retry_conversion'
  ) => {
    setIsFixing(true);
    const actionText = action === 'revert_status' ? 'reverting status' : 'marking for retry';
    const loadingToast = showLoading(`${actionText} for lead ${lead.contact_name}...`);

    try {
      const result = await LeadConversionValidator.fixLeadConversion(lead, validation, action);
      
      dismiss(loadingToast);

      if (result.success) {
        showSuccess('Lead fixed successfully', {
          description: result.message
        });
        
        // Refresh the leads data
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        
        // Remove from validation results
        setValidationResults(prev => 
          prev.filter(item => item.lead.id !== lead.id)
        );
      } else {
        showError('Failed to fix lead', {
          description: result.message
        });
      }

      return result;
    } catch (error) {
      dismiss(loadingToast);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Error fixing lead conversion', {
        description: errorMessage
      });
      throw error;
    } finally {
      setIsFixing(false);
    }
  }, [showSuccess, showError, showLoading, dismiss, queryClient]);

  const bulkFixLeads = useCallback(async (
    leadsToFix: Array<{ lead: Lead; validation: ConversionValidationResult }>,
    action: 'revert_status' | 'retry_conversion'
  ) => {
    setIsFixing(true);
    const loadingToast = showLoading(`Fixing ${leadsToFix.length} leads...`);

    try {
      const results = await Promise.allSettled(
        leadsToFix.map(({ lead, validation }) => 
          LeadConversionValidator.fixLeadConversion(lead, validation, action)
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      dismiss(loadingToast);

      if (failed === 0) {
        showSuccess(`Successfully fixed ${successful} leads`);
      } else {
        showError(`Fixed ${successful} leads, ${failed} failed`, {
          description: 'Some leads could not be fixed. Please try again or check manually.'
        });
      }

      // Refresh the leads data
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      // Remove successful fixes from validation results
      const successfulLeadIds = new Set(
        results
          .filter(r => r.status === 'fulfilled' && r.value.success)
          .map((_, index) => leadsToFix[index].lead.id)
      );
      
      setValidationResults(prev => 
        prev.filter(item => !successfulLeadIds.has(item.lead.id))
      );

      return { successful, failed };
    } catch (error) {
      dismiss(loadingToast);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Error bulk fixing leads', {
        description: errorMessage
      });
      throw error;
    } finally {
      setIsFixing(false);
    }
  }, [showSuccess, showError, showLoading, dismiss, queryClient]);

  return {
    isValidating,
    isFixing,
    validationResults,
    validateSingleLead,
    validateAllConvertedLeads,
    fixLeadConversion,
    bulkFixLeads,
    clearValidationResults: () => setValidationResults([])
  };
};
