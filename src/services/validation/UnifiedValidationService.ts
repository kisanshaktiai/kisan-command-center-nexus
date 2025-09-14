
import { BaseService } from '../BaseService';
import { Result, ResultHelpers } from '@/types/common/Result';
import { CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';

export interface ValidationResult extends Result<boolean> {
  fieldErrors?: Record<string, string[]>;
}

/**
 * Unified Validation Service - Centralized validation logic
 * Removes validation concerns from UI components
 */
export class UnifiedValidationService extends BaseService {
  private static instance: UnifiedValidationService;

  private constructor() {
    super();
  }

  public static getInstance(): UnifiedValidationService {
    if (!UnifiedValidationService.instance) {
      UnifiedValidationService.instance = new UnifiedValidationService();
    }
    return UnifiedValidationService.instance;
  }

  /**
   * Validate tenant creation data
   */
  validateTenantCreation(data: CreateTenantDTO): ValidationResult {
    const fieldErrors: Record<string, string[]> = {};

    // Name validation
    if (!data.name?.trim()) {
      fieldErrors.name = ['Organization name is required'];
    } else if (data.name.trim().length < 2) {
      fieldErrors.name = ['Organization name must be at least 2 characters'];
    }

    // Slug validation
    if (!data.slug?.trim()) {
      fieldErrors.slug = ['Slug is required'];
    } else {
      const slugErrors = this.validateSlug(data.slug);
      if (!slugErrors.success) {
        fieldErrors.slug = [slugErrors.error || 'Invalid slug format'];
      }
    }

    // Email validation
    if (!data.owner_email?.trim()) {
      fieldErrors.owner_email = ['Owner email is required'];
    } else {
      const emailErrors = this.validateEmail(data.owner_email);
      if (!emailErrors.success) {
        fieldErrors.owner_email = [emailErrors.error || 'Invalid email format'];
      }
    }

    // Owner name validation
    if (!data.owner_name?.trim()) {
      fieldErrors.owner_name = ['Owner name is required'];
    }

    const hasErrors = Object.keys(fieldErrors).length > 0;
    
    return {
      success: !hasErrors,
      data: !hasErrors,
      fieldErrors: hasErrors ? fieldErrors : undefined,
      error: hasErrors ? 'Validation failed' : undefined,
    };
  }

  /**
   * Validate tenant update data
   */
  validateTenantUpdate(data: UpdateTenantDTO): ValidationResult {
    const fieldErrors: Record<string, string[]> = {};

    // Email validation (if provided)
    if (data.owner_email && data.owner_email.trim()) {
      const emailErrors = this.validateEmail(data.owner_email);
      if (!emailErrors.success) {
        fieldErrors.owner_email = [emailErrors.error || 'Invalid email format'];
      }
    }

    // Name validation (if provided)
    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        fieldErrors.name = ['Organization name cannot be empty'];
      } else if (data.name.trim().length < 2) {
        fieldErrors.name = ['Organization name must be at least 2 characters'];
      }
    }

    const hasErrors = Object.keys(fieldErrors).length > 0;
    
    return {
      success: !hasErrors,
      data: !hasErrors,
      fieldErrors: hasErrors ? fieldErrors : undefined,
      error: hasErrors ? 'Validation failed' : undefined,
    };
  }

  /**
   * Email validation
   */
  private validateEmail(email: string): Result<boolean> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email.trim())) {
      return ResultHelpers.error('Invalid email format');
    }
    
    return ResultHelpers.success(true);
  }

  /**
   * Slug validation
   */
  private validateSlug(slug: string): Result<boolean> {
    const trimmedSlug = slug.trim();
    
    if (trimmedSlug.length < 3) {
      return ResultHelpers.error('Slug must be at least 3 characters long');
    }
    
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      return ResultHelpers.error('Slug must contain only lowercase letters, numbers, and hyphens');
    }
    
    if (trimmedSlug.startsWith('-') || trimmedSlug.endsWith('-')) {
      return ResultHelpers.error('Slug cannot start or end with a hyphen');
    }
    
    if (trimmedSlug.includes('--')) {
      return ResultHelpers.error('Slug cannot contain consecutive hyphens');
    }

    // Reserved slugs
    const reserved = ['api', 'www', 'admin', 'app', 'dashboard', 'mail', 'ftp', 'localhost'];
    if (reserved.includes(trimmedSlug)) {
      return ResultHelpers.error('This slug is reserved and cannot be used');
    }
    
    return ResultHelpers.success(true);
  }
}

export const unifiedValidationService = UnifiedValidationService.getInstance();
