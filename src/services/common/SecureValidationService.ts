
import { BaseService, ServiceResult } from '@/services/BaseService';
import { supabase } from '@/integrations/supabase/client';

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'unique' | 'minLength' | 'maxLength' | 'pattern';
  value?: any;
  table?: string;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: { field: string; message: string }[];
  warnings?: { field: string; message: string }[];
}

/**
 * Secure Validation Service
 * Provides centralized validation with security checks
 */
export class SecureValidationService extends BaseService {
  private static instance: SecureValidationService;

  private constructor() {
    super();
  }

  public static getInstance(): SecureValidationService {
    if (!SecureValidationService.instance) {
      SecureValidationService.instance = new SecureValidationService();
    }
    return SecureValidationService.instance;
  }

  /**
   * Validate data against multiple rules
   */
  async validateData(data: any, rules: ValidationRule[]): Promise<ServiceResult<ValidationResult>> {
    return this.executeOperation(
      async () => {
        const errors: { field: string; message: string }[] = [];
        const warnings: { field: string; message: string }[] = [];

        for (const rule of rules) {
          const fieldValue = data[rule.field];
          
          switch (rule.type) {
            case 'required':
              if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
                errors.push({
                  field: rule.field,
                  message: rule.message || `${rule.field} is required`
                });
              }
              break;

            case 'email':
              if (fieldValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldValue)) {
                errors.push({
                  field: rule.field,
                  message: rule.message || 'Invalid email format'
                });
              }
              break;

            case 'unique':
              if (fieldValue && rule.table) {
                const { data: existing } = await supabase
                  .from(rule.table)
                  .select('id')
                  .eq(rule.field, fieldValue)
                  .single();

                if (existing) {
                  errors.push({
                    field: rule.field,
                    message: rule.message || `${rule.field} already exists`
                  });
                }
              }
              break;

            case 'minLength':
              if (fieldValue && typeof fieldValue === 'string' && fieldValue.length < (rule.value || 0)) {
                errors.push({
                  field: rule.field,
                  message: rule.message || `${rule.field} must be at least ${rule.value} characters`
                });
              }
              break;

            case 'maxLength':
              if (fieldValue && typeof fieldValue === 'string' && fieldValue.length > (rule.value || 0)) {
                errors.push({
                  field: rule.field,
                  message: rule.message || `${rule.field} must be no more than ${rule.value} characters`
                });
              }
              break;

            case 'pattern':
              if (fieldValue && rule.value && !new RegExp(rule.value).test(fieldValue)) {
                errors.push({
                  field: rule.field,
                  message: rule.message || `${rule.field} format is invalid`
                });
              }
              break;
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      },
      'validateData'
    );
  }

  /**
   * Validate email format and availability
   */
  async validateEmail(email: string, table?: string, excludeId?: string): Promise<ServiceResult<ValidationResult>> {
    return this.executeOperation(
      async () => {
        const errors: { field: string; message: string }[] = [];

        // Format validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push({
            field: 'email',
            message: 'Invalid email format'
          });
        }

        // Uniqueness validation
        if (table && email) {
          let query = supabase.from(table).select('id').eq('email', email);
          
          if (excludeId) {
            query = query.neq('id', excludeId);
          }

          const { data: existing } = await query.single();
          
          if (existing) {
            errors.push({
              field: 'email',
              message: 'Email address is already in use'
            });
          }
        }

        return {
          isValid: errors.length === 0,
          errors
        };
      },
      'validateEmail'
    );
  }

  /**
   * Validate slug format and availability
   */
  async validateSlug(slug: string, excludeId?: string): Promise<ServiceResult<ValidationResult>> {
    return this.executeOperation(
      async () => {
        const errors: { field: string; message: string }[] = [];

        // Format validation
        if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
          errors.push({
            field: 'slug',
            message: 'Slug must contain only lowercase letters, numbers, and hyphens'
          });
        }

        if (slug && (slug.startsWith('-') || slug.endsWith('-'))) {
          errors.push({
            field: 'slug',
            message: 'Slug cannot start or end with a hyphen'
          });
        }

        if (slug && slug.includes('--')) {
          errors.push({
            field: 'slug',
            message: 'Slug cannot contain consecutive hyphens'
          });
        }

        // Length validation
        if (slug && slug.length < 3) {
          errors.push({
            field: 'slug',
            message: 'Slug must be at least 3 characters long'
          });
        }

        if (slug && slug.length > 50) {
          errors.push({
            field: 'slug',
            message: 'Slug must be no more than 50 characters long'
          });
        }

        // Reserved words check
        const reservedSlugs = ['api', 'www', 'admin', 'app', 'dashboard', 'mail', 'ftp', 'localhost'];
        if (slug && reservedSlugs.includes(slug)) {
          errors.push({
            field: 'slug',
            message: 'This slug is reserved and cannot be used'
          });
        }

        // Uniqueness validation
        if (slug && errors.length === 0) {
          let query = supabase.from('tenants').select('id').eq('slug', slug);
          
          if (excludeId) {
            query = query.neq('id', excludeId);
          }

          const { data: existing } = await query.single();
          
          if (existing) {
            errors.push({
              field: 'slug',
              message: 'This slug is already taken'
            });
          }
        }

        return {
          isValid: errors.length === 0,
          errors
        };
      },
      'validateSlug'
    );
  }

  /**
   * Sanitize input data
   */
  sanitizeInput(input: string): string {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  }

  /**
   * Validate business data
   */
  async validateBusinessData(data: any): Promise<ServiceResult<ValidationResult>> {
    const rules: ValidationRule[] = [
      { field: 'name', type: 'required' },
      { field: 'email', type: 'email' },
      { field: 'email', type: 'unique', table: 'tenants' },
      { field: 'name', type: 'minLength', value: 2 },
      { field: 'name', type: 'maxLength', value: 100 },
    ];

    return this.validateData(data, rules);
  }
}

// Export singleton instance
export const secureValidationService = SecureValidationService.getInstance();
