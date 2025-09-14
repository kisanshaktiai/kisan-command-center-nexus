
import DOMPurify from 'dompurify';
import { EnhancedSecurityUtils } from './enhancedSecurity';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue: string;
}

export class SecureInputValidator {
  /**
   * Comprehensive input validation and sanitization
   */
  static validateAndSanitize(
    value: string,
    rules: ValidationRule = {},
    fieldName: string = 'Field'
  ): ValidationResult {
    const errors: string[] = [];
    
    // First, sanitize the input
    const sanitizedValue = EnhancedSecurityUtils.sanitizeInput(value);
    
    // Required validation
    if (rules.required && (!sanitizedValue || sanitizedValue.trim() === '')) {
      errors.push(`${fieldName} is required`);
    }
    
    // Skip further validation if value is empty and not required
    if (!sanitizedValue && !rules.required) {
      return { isValid: true, errors: [], sanitizedValue: '' };
    }
    
    // Length validations
    if (rules.minLength && sanitizedValue.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} characters long`);
    }
    
    if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
      errors.push(`${fieldName} must be no more than ${rules.maxLength} characters long`);
    }
    
    // Pattern validation
    if (rules.pattern && !rules.pattern.test(sanitizedValue)) {
      errors.push(`${fieldName} format is invalid`);
    }
    
    // Custom validation
    if (rules.customValidator) {
      const customError = rules.customValidator(sanitizedValue);
      if (customError) {
        errors.push(customError);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue
    };
  }

  /**
   * Validate email addresses with enhanced security
   */
  static validateEmail(email: string): ValidationResult {
    const emailValidation = EnhancedSecurityUtils.validateEmail(email);
    
    return {
      isValid: emailValidation.isValid,
      errors: emailValidation.errors,
      sanitizedValue: DOMPurify.sanitize(email.trim().toLowerCase())
    };
  }

  /**
   * Validate tenant names with security considerations
   */
  static validateTenantName(name: string): ValidationResult {
    return this.validateAndSanitize(name, {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_.]+$/,
      customValidator: (value) => {
        // Check for suspicious patterns
        if (/(<script|javascript:|data:|vbscript:)/i.test(value)) {
          return 'Invalid characters detected';
        }
        if (/(\.\.|\/\/|\\\\)/g.test(value)) {
          return 'Path traversal patterns not allowed';
        }
        return null;
      }
    }, 'Organization name');
  }

  /**
   * Validate tenant slugs with strict rules
   */
  static validateTenantSlug(slug: string): ValidationResult {
    return this.validateAndSanitize(slug, {
      required: true,
      minLength: 3,
      maxLength: 50,
      pattern: /^[a-z0-9-]+$/,
      customValidator: (value) => {
        if (value.startsWith('-') || value.endsWith('-')) {
          return 'Slug cannot start or end with a hyphen';
        }
        if (value.includes('--')) {
          return 'Slug cannot contain consecutive hyphens';
        }
        const reserved = ['api', 'www', 'admin', 'app', 'dashboard', 'mail', 'ftp', 'localhost'];
        if (reserved.includes(value)) {
          return 'This slug is reserved and cannot be used';
        }
        return null;
      }
    }, 'Slug');
  }

  /**
   * Validate phone numbers
   */
  static validatePhoneNumber(phone: string): ValidationResult {
    return this.validateAndSanitize(phone, {
      pattern: /^[\+]?[1-9][\d\s\-\(\)]{7,14}$/,
      maxLength: 20,
      customValidator: (value) => {
        // Remove all non-digit characters except +
        const cleaned = value.replace(/[^\d+]/g, '');
        if (cleaned.length < 8 || cleaned.length > 15) {
          return 'Phone number must be between 8 and 15 digits';
        }
        return null;
      }
    }, 'Phone number');
  }

  /**
   * Validate business registration numbers
   */
  static validateBusinessRegistration(registration: string): ValidationResult {
    return this.validateAndSanitize(registration, {
      pattern: /^[A-Za-z0-9\-\/]+$/,
      minLength: 5,
      maxLength: 30,
      customValidator: (value) => {
        // Common business registration patterns validation could be added here
        return null;
      }
    }, 'Business registration');
  }

  /**
   * Batch validate multiple fields
   */
  static validateFields(fields: { [key: string]: { value: string; rules: ValidationRule; fieldName: string } }): {
    isValid: boolean;
    errors: { [key: string]: string[] };
    sanitizedValues: { [key: string]: string };
  } {
    const errors: { [key: string]: string[] } = {};
    const sanitizedValues: { [key: string]: string } = {};
    let isValid = true;

    for (const [key, { value, rules, fieldName }] of Object.entries(fields)) {
      const result = this.validateAndSanitize(value, rules, fieldName);
      
      if (!result.isValid) {
        errors[key] = result.errors;
        isValid = false;
      }
      
      sanitizedValues[key] = result.sanitizedValue;
    }

    return { isValid, errors, sanitizedValues };
  }
}
