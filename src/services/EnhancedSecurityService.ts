
import { supabase } from '@/integrations/supabase/client';
import { BaseService } from './BaseService';
import { ServiceResult } from '@/types/api';

interface SecurityEvent {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  event_type: string;
  metadata?: Record<string, any>;
}

interface RateLimitCheck {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestCount: number;
  timeWindow: number;
  failedAttempts?: number;
}

interface AccountLockoutStatus {
  isLocked: boolean;
  lockUntil?: Date;
  failedAttempts: number;
  reason?: string;
}

export class EnhancedSecurityService extends BaseService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly MAX_REQUESTS_PER_MINUTE = 60;

  async logSecurityEvent(event: SecurityEvent): Promise<ServiceResult<void>> {
    return this.executeOperation(async () => {
      const { error } = await supabase
        .from('security_events')
        .insert({
          user_id: event.userId,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          event_type: event.event_type,
          metadata: event.metadata || {},
          created_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    });
  }

  async checkRateLimit(params: RateLimitCheck): Promise<ServiceResult<{ allowed: boolean; retryAfter?: number }>> {
    return this.executeOperation(async () => {
      const now = new Date();
      const windowStart = new Date(now.getTime() - params.timeWindow);

      // Build the query conditions
      let query = supabase
        .from('security_events')
        .select('created_at')
        .gte('created_at', windowStart.toISOString());

      if (params.userId) {
        query = query.eq('user_id', params.userId);
      }
      if (params.ipAddress) {
        query = query.eq('ip_address', params.ipAddress);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const requestCount = data?.length || 0;
      const allowed = requestCount < params.requestCount;

      return {
        allowed,
        retryAfter: allowed ? undefined : params.timeWindow
      };
    });
  }

  async recordFailedLogin(email: string, ipAddress?: string): Promise<ServiceResult<void>> {
    return this.executeOperation(async () => {
      await this.logSecurityEvent({
        ipAddress,
        event_type: 'failed_login',
        metadata: { email }
      });
    });
  }

  async recordSuccessfulLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<ServiceResult<void>> {
    return this.executeOperation(async () => {
      await this.logSecurityEvent({
        userId,
        ipAddress,
        userAgent,
        event_type: 'successful_login'
      });
    });
  }

  async checkAccountLockout(email: string, ipAddress?: string): Promise<ServiceResult<AccountLockoutStatus>> {
    return this.executeOperation(async () => {
      const now = new Date();
      const windowStart = new Date(now.getTime() - this.LOCKOUT_DURATION);

      // Check failed login attempts in the lockout window
      let query = supabase
        .from('security_events')
        .select('created_at')
        .eq('event_type', 'failed_login')
        .gte('created_at', windowStart.toISOString())
        .like('metadata->>email', email);

      if (ipAddress) {
        query = query.eq('ip_address', ipAddress);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const failedAttempts = data?.length || 0;
      const isLocked = failedAttempts >= this.MAX_LOGIN_ATTEMPTS;

      if (isLocked && data && data.length > 0) {
        const lastFailedAttempt = new Date(data[0].created_at);
        const lockUntil = new Date(lastFailedAttempt.getTime() + this.LOCKOUT_DURATION);

        return {
          isLocked: now < lockUntil,
          lockUntil,
          failedAttempts,
          reason: 'Account temporarily locked due to multiple failed login attempts'
        };
      }

      return {
        isLocked: false,
        failedAttempts
      };
    });
  }

  async clearAccountLockout(email: string): Promise<ServiceResult<void>> {
    return this.executeOperation(async () => {
      await this.logSecurityEvent({
        event_type: 'lockout_cleared',
        metadata: { email, cleared_by: 'system' }
      });
    });
  }

  async detectSuspiciousActivity(userId: string, ipAddress?: string): Promise<ServiceResult<{ suspicious: boolean; reasons: string[] }>> {
    return this.executeOperation(async () => {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Check for multiple failed logins
      const { data: failedLogins, error: failedError } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', userId)
        .eq('event_type', 'failed_login')
        .gte('created_at', last24Hours.toISOString());

      if (failedError) {
        throw failedError;
      }

      // Check for logins from multiple IP addresses
      const { data: logins, error: loginError } = await supabase
        .from('security_events')
        .select('ip_address')
        .eq('user_id', userId)
        .eq('event_type', 'successful_login')
        .gte('created_at', last24Hours.toISOString());

      if (loginError) {
        throw loginError;
      }

      const reasons: string[] = [];
      
      if ((failedLogins?.length || 0) > 10) {
        reasons.push('Multiple failed login attempts in 24 hours');
      }

      const uniqueIPs = new Set(logins?.map(l => l.ip_address));
      if (uniqueIPs.size > 5) {
        reasons.push('Logins from multiple IP addresses');
      }

      return {
        suspicious: reasons.length > 0,
        reasons
      };
    });
  }
}

export const enhancedSecurityService = new EnhancedSecurityService();
