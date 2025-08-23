
import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';

interface RateLimitCheck {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestCount: number;
  timeWindow: number;
  failedAttempts?: number;
}

interface SecurityEvent {
  userId?: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
}

export class EnhancedSecurityService extends BaseService {
  private static instance: EnhancedSecurityService;

  private constructor() {
    super();
  }

  static getInstance(): EnhancedSecurityService {
    if (!EnhancedSecurityService.instance) {
      EnhancedSecurityService.instance = new EnhancedSecurityService();
    }
    return EnhancedSecurityService.instance;
  }

  async checkRateLimit(params: RateLimitCheck): Promise<ServiceResult<boolean>> {
    return this.executeOperation(async () => {
      // Rate limiting logic would go here
      // For now, return true (allowed)
      return true;
    }, 'check rate limit');
  }

  async logSecurityEvent(event: SecurityEvent): Promise<ServiceResult<void>> {
    return this.executeOperation(async () => {
      const { error } = await supabase
        .from('security_events')
        .insert({
          user_id: event.userId,
          event_type: event.eventType,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          metadata: event.metadata || {},
          created_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    }, 'log security event');
  }

  async trackFailedLogin(params: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestCount: number;
    timeWindow: number;
    failedAttempts?: number;
  }): Promise<ServiceResult<void>> {
    return this.executeOperation(async () => {
      await this.logSecurityEvent({
        userId: params.userId,
        eventType: 'failed_login',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: {
          requestCount: params.requestCount,
          timeWindow: params.timeWindow,
          failedAttempts: params.failedAttempts
        }
      });
    }, 'track failed login');
  }

  async validatePasswordStrength(password: string, policy?: PasswordPolicy): Promise<ServiceResult<{ isValid: boolean; violations: string[] }>> {
    return this.executeOperation(async () => {
      const defaultPolicy: PasswordPolicy = {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        preventCommonPasswords: true
      };

      const activePolicy = policy || defaultPolicy;
      const violations: string[] = [];

      if (password.length < activePolicy.minLength) {
        violations.push(`Password must be at least ${activePolicy.minLength} characters long`);
      }

      if (activePolicy.requireUppercase && !/[A-Z]/.test(password)) {
        violations.push('Password must contain at least one uppercase letter');
      }

      if (activePolicy.requireLowercase && !/[a-z]/.test(password)) {
        violations.push('Password must contain at least one lowercase letter');
      }

      if (activePolicy.requireNumbers && !/\d/.test(password)) {
        violations.push('Password must contain at least one number');
      }

      if (activePolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        violations.push('Password must contain at least one special character');
      }

      return {
        isValid: violations.length === 0,
        violations
      };
    }, 'validate password strength');
  }

  async generateSecureToken(length: number = 32): Promise<ServiceResult<string>> {
    return this.executeOperation(async () => {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }, 'generate secure token');
  }

  async validateSession(sessionToken: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(async () => {
      // Session validation logic would go here
      // For now, return true if token exists
      return !!sessionToken;
    }, 'validate session');
  }

  async encryptSensitiveData(data: string, key?: string): Promise<ServiceResult<string>> {
    return this.executeOperation(async () => {
      // Encryption logic would go here
      // For now, return base64 encoded data
      return btoa(data);
    }, 'encrypt sensitive data');
  }

  async decryptSensitiveData(encryptedData: string, key?: string): Promise<ServiceResult<string>> {
    return this.executeOperation(async () => {
      // Decryption logic would go here
      // For now, return base64 decoded data
      return atob(encryptedData);
    }, 'decrypt sensitive data');
  }
}

export const securityService = EnhancedSecurityService.getInstance();
