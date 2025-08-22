
// Enhanced validation utilities with better type safety
import { z } from 'zod';
import { ValidationResult, ValidationError } from '@/domain/types/services';

export class ValidationUtils {
  /**
   * Validate data against a Zod schema
   */
  static validateWithSchema<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): ValidationResult & { data?: T } {
    try {
      const validatedData = schema.parse(data);
      return {
        isValid: true,
        errors: [],
        data: validatedData
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors: ValidationError[] = error.errors.map(err => ({
          field: err.path.join('.'),
          code: err.code,
          message: err.message
        }));

        return {
          isValid: false,
          errors: validationErrors
        };
      }

      return {
        isValid: false,
        errors: [{
          field: 'unknown',
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        }]
      };
    }
  }

  /**
   * Create a validation error
   */
  static createError(field: string, code: string, message: string): ValidationError {
    return { field, code, message };
  }

  /**
   * Combine multiple validation results
   */
  static combineResults(...results: ValidationResult[]): ValidationResult {
    const allErrors = results.flatMap(result => result.errors);
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }

  /**
   * Validate required fields
   */
  static validateRequired(
    data: Record<string, unknown>,
    requiredFields: string[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    for (const field of requiredFields) {
      const value = data[field];
      if (value === undefined || value === null || value === '') {
        errors.push(this.createError(field, 'REQUIRED', `${field} is required`));
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        errors: [this.createError('email', 'INVALID_FORMAT', 'Invalid email format')]
      };
    }

    return {
      isValid: true,
      errors: []
    };
  }

  /**
   * Validate string length
   */
  static validateLength(
    value: string,
    field: string,
    min?: number,
    max?: number
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (min !== undefined && value.length < min) {
      errors.push(this.createError(field, 'TOO_SHORT', `${field} must be at least ${min} characters`));
    }

    if (max !== undefined && value.length > max) {
      errors.push(this.createError(field, 'TOO_LONG', `${field} must be no more than ${max} characters`));
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Common validation schemas
export const commonSchemas = {
  email: z.string().email('Invalid email format'),
  uuid: z.string().uuid('Invalid UUID format'),
  nonEmptyString: z.string().min(1, 'This field is required'),
  positiveNumber: z.number().positive('Must be a positive number'),
  url: z.string().url('Invalid URL format'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format')
};
