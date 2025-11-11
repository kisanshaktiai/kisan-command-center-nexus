/**
 * Enhanced Email Validation Utility
 * Provides comprehensive email validation with security best practices
 */

export interface EmailValidationResult {
  isValid: boolean;
  normalizedEmail: string;
  errors: string[];
}

/**
 * List of known disposable email domains
 * This is a basic list - in production, consider using a service or larger database
 */
const DISPOSABLE_DOMAINS = [
  'tempmail.com',
  'throwaway.email',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'trashmail.com',
  'fakeinbox.com',
  'temp-mail.org',
  'getnada.com',
  'maildrop.cc',
  'sharklasers.com',
  'grr.la',
  'spam4.me',
  'tmpeml.info'
];

/**
 * Enhanced RFC 5322 compliant email regex pattern
 */
const EMAIL_REGEX = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;

/**
 * Normalize email address (lowercase and trim)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Check if email domain is a known disposable email provider
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.includes(domain) : false;
}

/**
 * Validate email format with comprehensive checks
 */
export function validateEmailFormat(email: string): EmailValidationResult {
  const errors: string[] = [];
  
  // Normalize the email
  const normalizedEmail = normalizeEmail(email);
  
  // Check if email is empty
  if (!normalizedEmail || normalizedEmail.length === 0) {
    errors.push('Email address is required');
    return { isValid: false, normalizedEmail, errors };
  }
  
  // Check length constraints
  if (normalizedEmail.length > 255) {
    errors.push('Email address is too long (maximum 255 characters)');
  }
  
  // Check minimum length
  if (normalizedEmail.length < 3) {
    errors.push('Email address is too short');
  }
  
  // Check for spaces
  if (normalizedEmail.includes(' ')) {
    errors.push('Email address cannot contain spaces');
  }
  
  // Validate format with regex
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.push('Invalid email address format');
  }
  
  // Check for multiple @ symbols
  const atCount = (normalizedEmail.match(/@/g) || []).length;
  if (atCount !== 1) {
    errors.push('Email address must contain exactly one @ symbol');
  }
  
  // Validate domain part
  const parts = normalizedEmail.split('@');
  if (parts.length === 2) {
    const [localPart, domain] = parts;
    
    // Check local part
    if (localPart.length === 0) {
      errors.push('Email address cannot start with @');
    }
    
    if (localPart.length > 64) {
      errors.push('Email local part is too long (maximum 64 characters)');
    }
    
    // Check domain
    if (domain.length === 0) {
      errors.push('Email address must have a domain');
    }
    
    if (!domain.includes('.')) {
      errors.push('Email domain must contain at least one dot');
    }
    
    // Check for consecutive dots
    if (domain.includes('..') || localPart.includes('..')) {
      errors.push('Email address cannot contain consecutive dots');
    }
    
    // Check if domain starts or ends with dot/hyphen
    if (domain.startsWith('.') || domain.endsWith('.') || 
        domain.startsWith('-') || domain.endsWith('-')) {
      errors.push('Invalid email domain format');
    }
  }
  
  // Check for disposable email
  if (isDisposableEmail(normalizedEmail)) {
    errors.push('Disposable email addresses are not allowed');
  }
  
  return {
    isValid: errors.length === 0,
    normalizedEmail,
    errors
  };
}

/**
 * Simple email validation (less strict)
 */
export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return EMAIL_REGEX.test(normalized) && normalized.length >= 3 && normalized.length <= 255;
}

/**
 * Validate multiple emails at once
 */
export function validateEmailBatch(emails: string[]): Map<string, EmailValidationResult> {
  const results = new Map<string, EmailValidationResult>();
  
  for (const email of emails) {
    results.set(email, validateEmailFormat(email));
  }
  
  return results;
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string | null {
  const normalized = normalizeEmail(email);
  const parts = normalized.split('@');
  return parts.length === 2 ? parts[1] : null;
}

/**
 * Check if two emails are the same (case-insensitive)
 */
export function emailsMatch(email1: string, email2: string): boolean {
  return normalizeEmail(email1) === normalizeEmail(email2);
}
