/**
 * Form Validation Utilities
 * Centralized validation logic for all forms
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FieldValidation {
  value: any;
  rules: ValidationRule[];
}

export interface ValidationRule {
  test: (value: any) => boolean;
  message: string;
}

/**
 * Pre-defined validation rules
 */
export const validationRules = {
  required: (fieldName: string): ValidationRule => ({
    test: (value: any) => value !== null && value !== undefined && String(value).trim() !== '',
    message: `${fieldName} is required`
  }),

  email: (): ValidationRule => ({
    test: (value: string) => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value || ''),
    message: 'Please enter a valid email address'
  }),

  minLength: (min: number, fieldName?: string): ValidationRule => ({
    test: (value: string) => (value || '').length >= min,
    message: `${fieldName || 'Field'} must be at least ${min} characters long`
  }),

  maxLength: (max: number, fieldName?: string): ValidationRule => ({
    test: (value: string) => (value || '').length <= max,
    message: `${fieldName || 'Field'} must be no more than ${max} characters long`
  }),

  phone: (): ValidationRule => ({
    test: (value: string) => !value || /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, '')),
    message: 'Please enter a valid phone number'
  }),

  strongPassword: (): ValidationRule => ({
    test: (value: string) => {
      if (!value) return false;
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
      const isLongEnough = value.length >= 8;
      return hasUpper && hasLower && hasNumber && hasSpecial && isLongEnough;
    },
    message: 'Password must contain uppercase, lowercase, number, special character, and be 8+ characters'
  }),

  confirmPassword: (password: string): ValidationRule => ({
    test: (confirmValue: string) => confirmValue === password,
    message: 'Passwords do not match'
  }),

  slug: (): ValidationRule => ({
    test: (value: string) => {
      if (!value) return false;
      return /^[a-z0-9-]+$/.test(value) && 
             !value.startsWith('-') && 
             !value.endsWith('-') && 
             !value.includes('--');
    },
    message: 'Slug must contain only lowercase letters, numbers, and hyphens'
  }),

  url: (): ValidationRule => ({
    test: (value: string) => {
      if (!value) return true; // Optional URL
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: 'Please enter a valid URL'
  })
};

/**
 * Validate a single field against multiple rules
 */
export function validateField(value: any, rules: ValidationRule[]): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.test(value)) {
      errors.push(rule.message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate multiple fields at once
 */
export function validateForm(fields: Record<string, FieldValidation>): ValidationResult {
  const allErrors: string[] = [];

  for (const [fieldName, fieldValidation] of Object.entries(fields)) {
    const fieldResult = validateField(fieldValidation.value, fieldValidation.rules);
    allErrors.push(...fieldResult.errors);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Common form validation schemas
 */
export const formSchemas = {
  adminRegistration: {
    email: [validationRules.required('Email'), validationRules.email()],
    fullName: [validationRules.required('Full name'), validationRules.minLength(2, 'Full name')],
    password: [validationRules.required('Password'), validationRules.strongPassword()],
    phone: [validationRules.phone()]
  },

  bootstrap: {
    email: [validationRules.required('Email'), validationRules.email()],
    fullName: [validationRules.required('Full name'), validationRules.minLength(2, 'Full name')],
    password: [validationRules.required('Password'), validationRules.strongPassword()]
  },

  tenantCreation: {
    name: [validationRules.required('Organization name'), validationRules.minLength(2, 'Organization name')],
    slug: [validationRules.required('Slug'), validationRules.slug()],
    ownerEmail: [validationRules.email()],
    ownerPhone: [validationRules.phone()]
  },

  login: {
    email: [validationRules.required('Email'), validationRules.email()],
    password: [validationRules.required('Password')]
  }
};

/**
 * Helper function to validate specific form types
 */
export function validateFormBySchema(
  formType: keyof typeof formSchemas,
  data: Record<string, any>
): ValidationResult {
  const schema = formSchemas[formType];
  const fields: Record<string, FieldValidation> = {};

  for (const [fieldName, rules] of Object.entries(schema)) {
    fields[fieldName] = {
      value: data[fieldName],
      rules
    };
  }

  return validateForm(fields);
}

/**
 * Real-time validation hook helper
 */
export function createFieldValidator(rules: ValidationRule[]) {
  return (value: any): string | undefined => {
    const result = validateField(value, rules);
    return result.errors[0]; // Return first error or undefined
  };
}