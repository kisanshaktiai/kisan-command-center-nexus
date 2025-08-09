
/**
 * Enhanced security utility functions
 */

import { SECURITY_CONFIG } from '@/lib/constants/security';
import { supabase } from '@/integrations/supabase/client';

export class EnhancedSecurityUtils {
  /**
   * Enhanced XSS protection with comprehensive sanitization
   */
  static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    return input
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove dangerous HTML tags
      .replace(/<(iframe|object|embed|form|input|textarea|button|select|option|link|meta|base|style|title|head|html|body)[^>]*>/gi, '')
      // Remove event handlers
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*on\w+\s*=\s*[^>\s]*/gi, '')
      // Remove javascript: and data: URLs
      .replace(/javascript\s*:/gi, '')
      .replace(/data\s*:\s*text\/html/gi, '')
      // Remove potentially dangerous attributes
      .replace(/\s*(href|src|action|formaction)\s*=\s*["'][^"']*["']/gi, (match) => {
        if (match.toLowerCase().includes('javascript:') || 
            match.toLowerCase().includes('data:') || 
            match.toLowerCase().includes('vbscript:')) {
          return '';
        }
        return match;
      })
      // Encode remaining HTML entities
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      // Remove null bytes and control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Trim whitespace and limit length
      .trim()
      .slice(0, 5000);
  }

  /**
   * Enhanced email validation with security checks
   */
  static validateEmail(email: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!email || typeof email !== 'string') {
      errors.push('Email is required');
      return { isValid: false, errors };
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    // Length checks
    if (trimmedEmail.length > 254) {
      errors.push('Email address is too long');
    }
    
    if (trimmedEmail.length < 5) {
      errors.push('Email address is too short');
    }

    // Format validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(trimmedEmail)) {
      errors.push('Invalid email format');
    }

    // Security checks
    if (trimmedEmail.includes('..')) {
      errors.push('Email contains consecutive dots');
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /[<>]/,
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /%[0-9a-f]{2}/i // URL encoding
    ];

    if (dangerousPatterns.some(pattern => pattern.test(trimmedEmail))) {
      errors.push('Email contains invalid characters');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate CSRF token
   */
  static validateCSRFToken(token: string, sessionToken: string): boolean {
    if (!token || !sessionToken || typeof token !== 'string' || typeof sessionToken !== 'string') {
      return false;
    }
    
    // Simple comparison for now - in production, use timing-safe comparison
    return token === sessionToken && token.length === 64;
  }

  /**
   * Check for suspicious activity patterns
   */
  static detectSuspiciousActivity(data: {
    userAgent?: string;
    ipAddress?: string;
    requestCount?: number;
    timeWindow?: number;
  }): { isSuspicious: boolean; riskLevel: 'low' | 'medium' | 'high' | 'critical'; reasons: string[] } {
    const reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for automated requests
    if (data.userAgent) {
      const botPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /postman/i
      ];
      
      if (botPatterns.some(pattern => pattern.test(data.userAgent))) {
        reasons.push('Automated request detected');
        riskLevel = 'medium';
      }
    }

    // Check for high request frequency
    if (data.requestCount && data.timeWindow) {
      const requestsPerMinute = (data.requestCount / data.timeWindow) * 60000;
      if (requestsPerMinute > 100) {
        reasons.push('High request frequency detected');
        riskLevel = 'high';
      }
      if (requestsPerMinute > 300) {
        reasons.push('Extremely high request frequency detected');
        riskLevel = 'critical';
      }
    }

    return {
      isSuspicious: reasons.length > 0,
      riskLevel,
      reasons
    };
  }

  /**
   * Log security event
   */
  static async logSecurityEvent(event: {
    eventType: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    try {
      await supabase.rpc('log_security_event', {
        p_user_id: event.userId || null,
        p_event_type: event.eventType,
        p_event_details: event.details as any || {},
        p_ip_address: event.ipAddress || null,
        p_user_agent: event.userAgent || null,
        p_risk_level: event.riskLevel || 'low'
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Check account lockout status
   */
  static async checkAccountLockout(email: string, ipAddress?: string): Promise<{
    isLocked: boolean;
    attemptsRemaining: number;
    lockedUntil: string | null;
  }> {
    try {
      const { data, error } = await supabase.rpc('check_account_lockout', {
        p_email: email,
        p_ip_address: ipAddress || null
      });

      if (error) {
        console.error('Account lockout check failed:', error);
        return { isLocked: false, attemptsRemaining: 5, lockedUntil: null };
      }

      const result = data as any;
      return {
        isLocked: result?.is_locked || false,
        attemptsRemaining: result?.attempts_remaining || 0,
        lockedUntil: result?.locked_until || null
      };
    } catch (error) {
      console.error('Account lockout check error:', error);
      return { isLocked: false, attemptsRemaining: 5, lockedUntil: null };
    }
  }

  /**
   * Record failed login attempt
   */
  static async recordFailedLogin(email: string, ipAddress?: string): Promise<{
    isLocked: boolean;
    attemptsRemaining: number;
    lockedUntil: string | null;
  }> {
    try {
      const { data, error } = await supabase.rpc('record_failed_login', {
        p_email: email,
        p_ip_address: ipAddress || null
      });

      if (error) {
        console.error('Failed login recording failed:', error);
        return { isLocked: false, attemptsRemaining: 5, lockedUntil: null };
      }

      const result = data as any;
      return {
        isLocked: result?.is_locked || false,
        attemptsRemaining: result?.attempts_remaining || 0,
        lockedUntil: result?.locked_until || null
      };
    } catch (error) {
      console.error('Failed login recording error:', error);
      return { isLocked: false, attemptsRemaining: 5, lockedUntil: null };
    }
  }

  /**
   * Validate password strength with enhanced rules
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    if (!password) {
      return { isValid: false, score: 0, errors: ['Password is required'], suggestions: [] };
    }

    // Length check
    if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} characters long`);
    } else {
      score += Math.min(password.length * 2, 20);
    }

    // Character variety checks
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
      suggestions.push('Add lowercase letters');
    } else {
      score += 10;
    }

    if (!hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
      suggestions.push('Add uppercase letters');
    } else {
      score += 10;
    }

    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
      suggestions.push('Add numbers');
    } else {
      score += 10;
    }

    if (!hasSpecialChars) {
      errors.push('Password must contain at least one special character');
      suggestions.push('Add special characters (!@#$%^&*)');
    } else {
      score += 15;
    }

    // Common password patterns
    const commonPatterns = [
      /password/i,
      /123456/,
      /qwerty/i,
      /admin/i,
      /letmein/i,
      /welcome/i
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      errors.push('Password contains common patterns');
      suggestions.push('Avoid common words and patterns');
      score -= 20;
    }

    // Sequential characters
    if (/012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
      errors.push('Password contains sequential characters');
      suggestions.push('Avoid sequential characters');
      score -= 10;
    }

    // Repeated characters
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password contains repeated characters');
      suggestions.push('Avoid repeating characters');
      score -= 10;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      isValid: errors.length === 0 && score >= 60,
      score,
      errors,
      suggestions
    };
  }

  /**
   * Generate secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    const mandatoryChars = [
      lowercase[Math.floor(Math.random() * lowercase.length)],
      uppercase[Math.floor(Math.random() * uppercase.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];

    let password = mandatoryChars.join('');
    
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Get client IP address from request headers
   */
  static getClientIP(headers: Record<string, string>): string | null {
    const ipHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip',
      'x-client-ip',
      'x-forwarded',
      'forwarded-for',
      'forwarded'
    ];

    for (const header of ipHeaders) {
      const value = headers[header];
      if (value) {
        // Take the first IP if there are multiple
        const ip = value.split(',')[0].trim();
        if (ip && ip !== 'unknown') {
          return ip;
        }
      }
    }

    return null;
  }
}
