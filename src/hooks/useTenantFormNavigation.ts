import { useState, useCallback } from 'react';
import { TenantFormData } from '@/types/tenant';

export interface TabValidation {
  isValid: boolean;
  errors: string[];
}

export const useTenantFormNavigation = (
  formData: TenantFormData,
  isEditing: boolean,
  isSlugValid: boolean,
  isSlugChecking: boolean,
  emailValidationState?: {
    isValidating: boolean;
    emailExists: boolean | null;
  }
) => {
  const [currentTab, setCurrentTab] = useState('basic');

  const validateBasicTab = useCallback((): TabValidation => {
    const errors: string[] = [];

    if (!formData.name?.trim()) errors.push('Organization name is required');
    if (!formData.slug?.trim()) errors.push('Slug is required');
    if (!isSlugValid && !isSlugChecking) errors.push('Slug must be available');
    if (!formData.type) errors.push('Organization type is required');
    if (!formData.subscription_plan) errors.push('Subscription plan is required');
    if (!formData.subdomain?.trim()) errors.push('Subdomain is required');

    // For new tenants, require admin details
    if (!isEditing) {
      if (!formData.owner_name?.trim()) errors.push('Administrator name is required');
      if (!formData.owner_email?.trim()) {
        errors.push('Administrator email is required');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.owner_email)) {
          errors.push('Valid administrator email is required');
        } else if (emailValidationState?.isValidating) {
          errors.push('Checking email availability...');
        } else if (emailValidationState?.emailExists === true) {
          errors.push('Administrator email already exists. Please use a different email address.');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [formData, isEditing, isSlugValid, isSlugChecking, emailValidationState]);

  const validateBusinessTab = useCallback((): TabValidation => {
    const errors: string[] = [];
    // Business tab is optional, but we can add validation if needed
    return {
      isValid: true,
      errors
    };
  }, []);

  const validateLimitsTab = useCallback((): TabValidation => {
    const errors: string[] = [];
    // Limits tab validation
    if (formData.max_farmers && formData.max_farmers < 0) {
      errors.push('Maximum farmers must be positive');
    }
    if (formData.max_dealers && formData.max_dealers < 0) {
      errors.push('Maximum dealers must be positive');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [formData]);

  const validateBrandingTab = useCallback((): TabValidation => {
    const errors: string[] = [];
    // Branding tab is optional
    return {
      isValid: true,
      errors
    };
  }, []);

  const getTabValidation = useCallback((tab: string): TabValidation => {
    switch (tab) {
      case 'basic':
        return validateBasicTab();
      case 'business':
        return validateBusinessTab();
      case 'limits':
        return validateLimitsTab();
      case 'branding':
        return validateBrandingTab();
      default:
        return { isValid: true, errors: [] };
    }
  }, [validateBasicTab, validateBusinessTab, validateLimitsTab, validateBrandingTab]);

  const tabs = [
    { id: 'basic', label: 'Basic Info', validation: getTabValidation('basic') },
    { id: 'business', label: 'Business Details', validation: getTabValidation('business') },
    { id: 'limits', label: 'Limits & Features', validation: getTabValidation('limits') },  
    { id: 'branding', label: 'Branding', validation: getTabValidation('branding') }
  ];

  const currentTabIndex = tabs.findIndex(tab => tab.id === currentTab);
  const canGoNext = currentTabIndex < tabs.length - 1;
  const canGoPrevious = currentTabIndex > 0;
  const canAdvance = tabs[currentTabIndex]?.validation.isValid || false;

  const goNext = useCallback(() => {
    if (canGoNext && canAdvance) {
      setCurrentTab(tabs[currentTabIndex + 1].id);
    }
  }, [canGoNext, canAdvance, currentTabIndex, tabs]);

  const goPrevious = useCallback(() => {
    if (canGoPrevious) {
      setCurrentTab(tabs[currentTabIndex - 1].id);
    }
  }, [canGoPrevious, currentTabIndex, tabs]);

  const goToTab = useCallback((tabId: string) => {
    setCurrentTab(tabId);
  }, []);

  const isFormComplete = tabs.every(tab => tab.validation.isValid);

  return {
    currentTab,
    currentTabIndex,
    tabs,
    canGoNext,
    canGoPrevious,
    canAdvance,
    goNext,
    goPrevious,
    goToTab,
    isFormComplete,
    getCurrentTabValidation: () => getTabValidation(currentTab)
  };
};
