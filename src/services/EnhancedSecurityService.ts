
import { BaseService, ServiceResult } from './BaseService';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedSecurityUtils } from '@/utils/enhancedSecurity';

export interface SecurityEventData {
  event_type: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  event_details: any;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  created_at: string;
  resolved_at?: string;
}

export class EnhancedSecurityService extends BaseService {
  private static instance: EnhancedSecurityService;
  private monitoringEnabled = true;

  private constructor() {
    super();
  }

  public static getInstance(): EnhancedSecurityService {
    if (!EnhancedSecurityService.instance) {
      EnhancedSecurityService.instance = new EnhancedSecurityService();
    }
    return EnhancedSecurityService.instance;
  }

  /**
   * Log security events to the database using the new function signature
   */
  async logSecurityEvent(eventData: SecurityEventData): Promise<ServiceResult<string>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase.rpc('log_security_event', {
        p_user_id: eventData.user_id || null,
        p_event_type: eventData.event_type,
        p_event_details: eventData.event_details,
        p_ip_address: eventData.ip_address || null,
        p_user_agent: eventData.user_agent || null,
        p_risk_level: eventData.risk_level
      });

      if (error) throw error;
      
      // Trigger real-time alerts for high-risk events
      if (eventData.risk_level === 'critical' || eventData.risk_level === 'high') {
        await this.triggerSecurityAlert(eventData);
      }

      return data;
    }, 'logSecurityEvent');
  }

  /**
   * Monitor suspicious activities in real-time
   */
  async monitorSuspiciousActivity(activityData: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestCount?: number;
    timeWindow?: number;
    failedAttempts?: number;
  }): Promise<ServiceResult<{ isSuspicious: boolean; riskLevel: string; reasons: string[] }>> {
    return this.executeOperation(async () => {
      const analysis = EnhancedSecurityUtils.detectSuspiciousActivity(activityData);
      
      if (analysis.isSuspicious) {
        await this.logSecurityEvent({
          event_type: 'suspicious_activity_detected',
          risk_level: analysis.riskLevel as 'low' | 'medium' | 'high' | 'critical',
          event_details: {
            reasons: analysis.reasons,
            activityData,
            timestamp: new Date().toISOString()
          },
          user_id: activityData.userId,
          ip_address: activityData.ipAddress,
          user_agent: activityData.userAgent
        });
      }

      return analysis;
    }, 'monitorSuspiciousActivity');
  }

  /**
   * Check account lockout status
   */
  async checkAccountLockout(email: string, ipAddress?: string): Promise<ServiceResult<any>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase.rpc('check_account_lockout', {
        p_email: email,
        p_ip_address: ipAddress || null
      });

      if (error) throw error;
      return data;
    }, 'checkAccountLockout');
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(email: string, ipAddress?: string): Promise<ServiceResult<any>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase.rpc('record_failed_login', {
        p_email: email,
        p_ip_address: ipAddress || null
      });

      if (error) throw error;
      
      // Log security event
      await this.logSecurityEvent({
        event_type: 'failed_login_attempt',
        risk_level: 'medium',
        event_details: {
          email,
          timestamp: new Date().toISOString()
        },
        ip_address: ipAddress
      });

      return data;
    }, 'recordFailedLogin');
  }

  /**
   * Validate CSRF token
   */
  async validateCSRFToken(token: string, sessionData: any): Promise<ServiceResult<boolean>> {
    return this.executeOperation(async () => {
      const isValid = EnhancedSecurityUtils.validateCSRFToken(token, sessionData?.sessionToken);
      
      if (!isValid) {
        await this.logSecurityEvent({
          event_type: 'invalid_csrf_token',
          risk_level: 'high',
          event_details: {
            token: token.substring(0, 10) + '...',
            timestamp: new Date().toISOString()
          },
          user_id: sessionData?.userId
        });
      }

      return isValid;
    }, 'validateCSRFToken');
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeRange: string = '24h'): Promise<ServiceResult<any>> {
    return this.executeOperation(async () => {
      let dateFilter = new Date();
      
      switch (timeRange) {
        case '1h':
          dateFilter.setHours(dateFilter.getHours() - 1);
          break;
        case '24h':
          dateFilter.setDate(dateFilter.getDate() - 1);
          break;
        case '7d':
          dateFilter.setDate(dateFilter.getDate() - 7);
          break;
        case '30d':
          dateFilter.setDate(dateFilter.getDate() - 30);
          break;
      }

      const { data, error } = await supabase
        .from('security_events')
        .select('event_type, risk_level, created_at')
        .gte('created_at', dateFilter.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process metrics
      const metrics = {
        totalEvents: data.length,
        criticalEvents: data.filter(e => e.risk_level === 'critical').length,
        highRiskEvents: data.filter(e => e.risk_level === 'high').length,
        eventsByType: data.reduce((acc: any, event) => {
          acc[event.event_type] = (acc[event.event_type] || 0) + 1;
          return acc;
        }, {}),
        timeline: data.slice(0, 20) // Last 20 events for timeline
      };

      return metrics;
    }, 'getSecurityMetrics');
  }

  /**
   * Trigger security alert for critical events
   */
  private async triggerSecurityAlert(eventData: SecurityEventData): Promise<void> {
    try {
      // Check if security_alerts table exists by attempting to insert
      const { error } = await supabase
        .from('security_alerts')
        .insert({
          alert_type: eventData.event_type,
          severity: eventData.risk_level === 'critical' ? 'critical' : 'error',
          message: `Security event detected: ${eventData.event_type}`,
          event_details: eventData.event_details
        });

      if (error && error.code !== '42P01') { // Ignore if table doesn't exist
        console.error('Failed to create security alert:', error);
      }
    } catch (error) {
      console.error('Error triggering security alert:', error);
    }
  }

  /**
   * Enable/disable security monitoring
   */
  setMonitoringEnabled(enabled: boolean): void {
    this.monitoringEnabled = enabled;
  }

  /**
   * Check if monitoring is enabled
   */
  isMonitoringEnabled(): boolean {
    return this.monitoringEnabled;
  }
}

export const enhancedSecurityService = EnhancedSecurityService.getInstance();
