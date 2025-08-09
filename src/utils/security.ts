
import { SECURITY_CONFIG, ROLE_PERMISSIONS, type Role, type Permission } from '@/lib/constants/security';
import { EnhancedSecurityUtils } from './enhancedSecurity';

/**
 * Security utility functions - Enhanced version
 */

export class SecurityUtils {
  /**
   * Check if user has specific permission
   */
  static hasPermission(userRole: Role, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole];
    return rolePermissions?.includes(permission) ?? false;
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(userRole: Role, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Check if user has all specified permissions
   */
  static hasAllPermissions(userRole: Role, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Enhanced password validation using new security utils
   */
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
    score?: number;
    suggestions?: string[];
  } {
    const result = EnhancedSecurityUtils.validatePasswordStrength(password);
    return {
      isValid: result.isValid,
      errors: result.errors,
      score: result.score,
      suggestions: result.suggestions
    };
  }

  /**
   * Generate secure random string
   */
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Enhanced input sanitization
   */
  static sanitizeInput(input: string): string {
    return EnhancedSecurityUtils.sanitizeInput(input);
  }

  /**
   * Enhanced email validation
   */
  static validateEmail(email: string): { isValid: boolean; errors: string[] } {
    return EnhancedSecurityUtils.validateEmail(email);
  }

  /**
   * Check if session is expired
   */
  static isSessionExpired(lastActivity: Date): boolean {
    const now = new Date();
    const timeDiff = now.getTime() - lastActivity.getTime();
    return timeDiff > SECURITY_CONFIG.SESSION_TIMEOUT;
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    return EnhancedSecurityUtils.generateCSRFToken();
  }

  /**
   * Validate CSRF token
   */
  static validateCSRFToken(token: string, sessionToken: string): boolean {
    return EnhancedSecurityUtils.validateCSRFToken(token, sessionToken);
  }

  /**
   * Check account lockout status
   */
  static async checkAccountLockout(email: string, ipAddress?: string) {
    return EnhancedSecurityUtils.checkAccountLockout(email, ipAddress);
  }

  /**
   * Record failed login attempt
   */
  static async recordFailedLogin(email: string, ipAddress?: string) {
    return EnhancedSecurityUtils.recordFailedLogin(email, ipAddress);
  }

  /**
   * Generate secure password
   */
  static generateSecurePassword(length: number = 16): string {
    return EnhancedSecurityUtils.generateSecurePassword(length);
  }
}
