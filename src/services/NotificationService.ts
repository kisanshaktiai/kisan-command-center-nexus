
import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  data?: Record<string, any>;
  tenant_id?: string;
  expires_at?: string;
}

export class NotificationService {
  private static instance: NotificationService;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Create a new notification
  async createNotification(notification: NotificationData): Promise<void> {
    try {
      const { error } = await supabase
        .from('platform_notifications')
        .insert({
          type: notification.type,
          title: notification.title,
          message: notification.message,
          severity: notification.severity,
          data: notification.data || {},
          tenant_id: notification.tenant_id,
          expires_at: notification.expires_at
        });

      if (error) {
        console.error('Failed to create notification:', error);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Monitor API usage and create alerts
  async monitorApiUsage(): Promise<void> {
    try {
      // Check for high error rates in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { data: recentLogs } = await supabase
        .from('api_logs')
        .select('status_code, tenant_id')
        .gte('created_at', oneHourAgo.toISOString());

      if (recentLogs) {
        const errorRate = recentLogs.filter(log => log.status_code >= 400).length / recentLogs.length;
        
        if (errorRate > 0.1) { // More than 10% error rate
          await this.createNotification({
            type: 'api_high_error_rate',
            title: 'High API Error Rate Detected',
            message: `API error rate is ${Math.round(errorRate * 100)}% in the last hour`,
            severity: 'warning',
            data: { error_rate: errorRate, period: '1_hour' }
          });
        }
      }
    } catch (error) {
      console.error('Error monitoring API usage:', error);
    }
  }

  // Monitor resource usage
  async monitorResourceUsage(): Promise<void> {
    try {
      // This would typically check actual system metrics
      // For demo, we'll simulate high resource usage
      const cpuUsage = Math.random() * 100;
      const memoryUsage = Math.random() * 100;
      
      if (cpuUsage > 80) {
        await this.createNotification({
          type: 'high_cpu_usage',
          title: 'High CPU Usage Alert',
          message: `CPU usage is at ${Math.round(cpuUsage)}%`,
          severity: 'warning',
          data: { cpu_usage: cpuUsage }
        });
      }
      
      if (memoryUsage > 85) {
        await this.createNotification({
          type: 'high_memory_usage',
          title: 'High Memory Usage Alert',
          message: `Memory usage is at ${Math.round(memoryUsage)}%`,
          severity: 'error',
          data: { memory_usage: memoryUsage }
        });
      }
    } catch (error) {
      console.error('Error monitoring resource usage:', error);
    }
  }

  // Check for expired subscriptions
  async checkExpiredSubscriptions(): Promise<void> {
    try {
      const { data: expiredSubs, error } = await supabase
        .from('tenant_subscriptions')
        .select('tenant_id, current_period_end')
        .lt('current_period_end', new Date().toISOString())
        .eq('status', 'active');

      if (error) {
        console.error('Error checking subscriptions:', error);
        return;
      }

      if (expiredSubs && expiredSubs.length > 0) {
        for (const sub of expiredSubs) {
          await this.createNotification({
            type: 'subscription_expired',
            title: 'Subscription Expired',
            message: `Tenant subscription has expired and needs renewal`,
            severity: 'error',
            tenant_id: sub.tenant_id,
            data: { expired_date: sub.current_period_end }
          });
        }
      }
    } catch (error) {
      console.error('Error checking expired subscriptions:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();
