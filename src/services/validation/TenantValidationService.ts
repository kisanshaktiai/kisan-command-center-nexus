
import { BaseService } from '../BaseService';
import { TenantFormData } from '@/types/tenant';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

/**
 * Dedicated service for tenant validation logic
 */
export class TenantValidationService extends BaseService {
  private static instance: TenantValidationService;

  private constructor() {
    super();
  }

  public static getInstance(): TenantValidationService {
    if (!TenantValidationService.instance) {
      TenantValidationService.instance = new TenantValidationService();
    }
    return TenantValidationService.instance;
  }

  validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (!email?.trim()) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.push('Invalid email format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateSlug(slug: string): ValidationResult {
    const errors: string[] = [];

    if (!slug?.trim()) {
      errors.push('Slug is required');
    } else {
      const trimmedSlug = slug.trim();
      
      if (trimmedSlug.length < 3) {
        errors.push('Slug must be at least 3 characters long');
      }
      
      if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
        errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
      }
      
      if (trimmedSlug.startsWith('-') || trimmedSlug.endsWith('-')) {
        errors.push('Slug cannot start or end with a hyphen');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateSubdomain(subdomain: string): ValidationResult {
    const errors: string[] = [];

    if (!subdomain?.trim()) {
      errors.push('Subdomain is required');
    } else {
      const trimmedSubdomain = subdomain.trim();
      
      if (!/^[a-z0-9-]+$/.test(trimmedSubdomain)) {
        errors.push('Subdomain must contain only lowercase letters, numbers, and hyphens');
      }
      
      if (trimmedSubdomain.startsWith('-') || trimmedSubdomain.endsWith('-')) {
        errors.push('Subdomain cannot start or end with a hyphen');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateBasicInfo(formData: TenantFormData, isEditing: boolean): FormValidationResult {
    const errors: Record<string, string[]> = {};

    // Organization name
    if (!formData.name?.trim()) {
      errors.name = ['Organization name is required'];
    }

    // Slug validation
    const slugValidation = this.validateSlug(formData.slug || '');
    if (!slugValidation.isValid) {
      errors.slug = slugValidation.errors;
    }

    // Type validation
    if (!formData.type) {
      errors.type = ['Organization type is required'];
    }

    // Subscription plan validation
    if (!formData.subscription_plan) {
      errors.subscription_plan = ['Subscription plan is required'];
    }

    // Subdomain validation
    const subdomainValidation = this.validateSubdomain(formData.subdomain || '');
    if (!subdomainValidation.isValid) {
      errors.subdomain = subdomainValidation.errors;
    }

    // Admin details (required for new tenants)
    if (!isEditing) {
      if (!formData.owner_name?.trim()) {
        errors.owner_name = ['Administrator name is required'];
      }

      const emailValidation = this.validateEmail(formData.owner_email || '');
      if (!emailValidation.isValid) {
        errors.owner_email = emailValidation.errors;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

export const tenantValidationService = TenantValidationService.getInstance();
