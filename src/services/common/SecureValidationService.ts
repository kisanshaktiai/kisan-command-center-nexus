
import { supabase } from '@/integrations/supabase/client';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
}

export interface DuplicateCheckOptions {
  excludeId?: string;
  tenantId?: string;
}

// Type for slug availability RPC response
interface SlugAvailabilityResponse {
  available: boolean;
  error?: string;
  code?: string;
  message?: string;
}

/**
 * Secure validation service with tenant isolation
 * Provides reusable validation functions across the application
 */
export class SecureValidationService {
  /**
   * Validate email format and existence
   */
  static async validateEmail(email: string): Promise<ValidationResult> {
    try {
      // Basic format validation
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(email)) {
        return {
          isValid: false,
          error: 'Invalid email format',
          code: 'INVALID_FORMAT'
        };
      }

      // Check for common disposable email domains
      const disposableDomains = ['tempmail.org', '10minutemail.com', 'guerrillamail.com'];
      const domain = email.split('@')[1].toLowerCase();
      if (disposableDomains.includes(domain)) {
        return {
          isValid: false,
          error: 'Disposable email addresses are not allowed',
          code: 'DISPOSABLE_EMAIL'
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Email validation error:', error);
      return {
        isValid: false,
        error: 'Email validation failed',
        code: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Validate slug format and availability using existing function
   */
  static async validateSlug(slug: string, excludeId?: string): Promise<ValidationResult> {
    try {
      // Use existing check_slug_availability function
      const { data, error } = await supabase.rpc('check_slug_availability', {
        p_slug: slug,
        p_tenant_id: excludeId || null
      });

      if (error) {
        throw error;
      }

      // Type guard to ensure data is the expected format
      const isSlugResponse = (data: any): data is SlugAvailabilityResponse => {
        return data && typeof data === 'object' && 'available' in data;
      };

      if (!isSlugResponse(data)) {
        throw new Error('Invalid response format from slug validation');
      }

      return {
        isValid: data.available,
        error: data.available ? undefined : data.error,
        code: data.code
      };
    } catch (error: any) {
      console.error('Slug validation error:', error);
      return {
        isValid: false,
        error: error.message || 'Slug validation failed',
        code: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Validate business registration number
   */
  static async validateBusinessRegistration(registrationNumber: string): Promise<ValidationResult> {
    try {
      if (!registrationNumber || registrationNumber.trim().length === 0) {
        return {
          isValid: false,
          error: 'Business registration number is required',
          code: 'REQUIRED_FIELD'
        };
      }

      // Basic format validation (adjust based on your country's format)
      const cleaned = registrationNumber.replace(/[^a-zA-Z0-9]/g, '');
      if (cleaned.length < 6 || cleaned.length > 20) {
        return {
          isValid: false,
          error: 'Invalid business registration number format',
          code: 'INVALID_FORMAT'
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Business registration validation error:', error);
      return {
        isValid: false,
        error: 'Business registration validation failed',
        code: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Check for duplicate values in specific tables (type-safe approach)
   */
  static async checkTenantSlugDuplicate(slug: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Duplicate check error:', error);
        return true; // Assume duplicate on error for safety
      }

      return (data && data.length > 0);
    } catch (error) {
      console.error('Duplicate check error:', error);
      return true; // Assume duplicate on error for safety
    }
  }

  /**
   * Check for duplicate email in admin_users
   */
  static async checkAdminEmailDuplicate(email: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('admin_users')
        .select('id')
        .eq('email', email);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Admin email duplicate check error:', error);
        return true; // Assume duplicate on error for safety
      }

      return (data && data.length > 0);
    } catch (error) {
      console.error('Admin email duplicate check error:', error);
      return true; // Assume duplicate on error for safety
    }
  }

  /**
   * Validate tenant data comprehensively
   */
  static async validateTenantData(data: {
    name: string;
    slug: string;
    owner_email?: string;
    business_registration?: string;
  }, excludeId?: string): Promise<ValidationResult> {
    try {
      // Validate name
      if (!data.name || data.name.trim().length < 2) {
        return {
          isValid: false,
          error: 'Tenant name must be at least 2 characters long',
          code: 'INVALID_NAME'
        };
      }

      // Validate slug
      const slugValidation = await this.validateSlug(data.slug, excludeId);
      if (!slugValidation.isValid) {
        return slugValidation;
      }

      // Validate email if provided
      if (data.owner_email) {
        const emailValidation = await this.validateEmail(data.owner_email);
        if (!emailValidation.isValid) {
          return emailValidation;
        }
      }

      // Validate business registration if provided
      if (data.business_registration) {
        const businessValidation = await this.validateBusinessRegistration(data.business_registration);
        if (!businessValidation.isValid) {
          return businessValidation;
        }
      }

      return { isValid: true };
    } catch (error: any) {
      console.error('Tenant data validation error:', error);
      return {
        isValid: false,
        error: error.message || 'Tenant data validation failed',
        code: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Sanitize input data to prevent injection attacks
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>\"']/g, '') // Remove potential HTML/SQL injection characters
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate date format and range
   */
  static validateDate(dateString: string, allowPast: boolean = true): ValidationResult {
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return {
          isValid: false,
          error: 'Invalid date format',
          code: 'INVALID_DATE'
        };
      }

      if (!allowPast && date < new Date()) {
        return {
          isValid: false,
          error: 'Date cannot be in the past',
          code: 'PAST_DATE'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Date validation failed',
        code: 'VALIDATION_ERROR'
      };
    }
  }
}
