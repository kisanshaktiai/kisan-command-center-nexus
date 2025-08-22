
/**
 * Enhanced security utilities for advanced protection
 */
export class EnhancedSecurityUtils {
  /**
   * Validate password strength with detailed feedback
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number;
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
      suggestions.push('Use at least 8 characters');
    } else {
      score += 1;
    }

    // Character variety checks
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters');
      suggestions.push('Include lowercase letters (a-z)');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters');
      suggestions.push('Include uppercase letters (A-Z)');
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain numbers');
      suggestions.push('Include numbers (0-9)');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain special characters');
      suggestions.push('Include special characters (!@#$%^&*)');
    } else {
      score += 1;
    }

    return {
      isValid: errors.length === 0,
      errors,
      score,
      suggestions
    };
  }

  /**
   * Sanitize input to prevent XSS
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  /**
   * Enhanced email validation
   */
  static validateEmail(email: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    if (email.length > 254) {
      errors.push('Email address too long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
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
    return token === sessionToken && token.length === 64;
  }

  /**
   * Check account lockout status
   */
  static async checkAccountLockout(email: string, ipAddress?: string): Promise<{
    isLocked: boolean;
    attemptsRemaining: number;
    lockedUntil: string | null;
  }> {
    // Mock implementation - in real app would check database
    return {
      isLocked: false,
      attemptsRemaining: 5,
      lockedUntil: null
    };
  }

  /**
   * Record failed login attempt
   */
  static async recordFailedLogin(email: string, ipAddress?: string): Promise<void> {
    // Mock implementation - in real app would update database
    console.log(`Failed login attempt recorded for ${email} from ${ipAddress}`);
  }

  /**
   * Generate secure password
   */
  static generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill remaining length
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Get client IP address from headers
   */
  static getClientIP(headers: Record<string, string>): string | null {
    // Try different header possibilities
    const ipHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip'
    ];

    for (const header of ipHeaders) {
      const value = headers[header];
      if (value) {
        // Take first IP if comma-separated
        return value.split(',')[0].trim();
      }
    }

    return null;
  }

  /**
   * Detect suspicious activity
   */
  static detectSuspiciousActivity(params: {
    userAgent?: string;
    requestCount: number;
    timeWindow: number;
  }): {
    isSuspicious: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    reasons: string[];
  } {
    const reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check request rate
    if (params.requestCount > 100) {
      reasons.push('High request rate');
      riskLevel = 'critical';
    } else if (params.requestCount > 50) {
      reasons.push('Elevated request rate');
      riskLevel = 'high';
    } else if (params.requestCount > 20) {
      reasons.push('Moderate request rate');
      riskLevel = 'medium';
    }

    // Check user agent
    if (params.userAgent) {
      if (params.userAgent.includes('bot') || params.userAgent.includes('crawler')) {
        reasons.push('Bot-like user agent');
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
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
    // Mock implementation - in real app would log to database/monitoring service
    console.log('Security Event:', {
      timestamp: new Date().toISOString(),
      ...event
    });
  }
}
