
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OptimizedRealtimeData {
  recentTenants: any[];
  activeSessions: any[];
  criticalNotifications: any[];
  systemAlerts: any[];
}

export const useOptimizedRealtimeSubscriptions = () => {
  const [data, setData] = useState<OptimizedRealtimeData>({
    recentTenants: [],
    activeSessions: [],
    criticalNotifications: [],
    systemAlerts: []
  });

  useEffect(() => {
    console.log('Setting up optimized real-time subscriptions with minimal channels...');

    // Initial data fetch - limited and focused
    const fetchInitialData = async () => {
      try {
        const [
          tenantsRes, 
          sessionsRes, 
          notificationsRes
        ] = await Promise.all([
          // Only recent tenants, limited columns
          supabase
            .from('tenants')
            .select('id, name, status, created_at')
            .order('created_at', { ascending: false })
            .limit(10),
          
          // Active sessions only, limited columns
          supabase
            .from('active_sessions')
            .select('id, user_id, tenant_id, last_active_at')
            .eq('is_active', true)
            .order('last_active_at', { ascending: false })
            .limit(20),
          
          // Only unread critical notifications
          supabase
            .from('platform_notifications')
            .select('id, title, message, severity, created_at')
            .eq('is_read', false)
            .in('severity', ['error', 'warning'])
            .order('created_at', { ascending: false })
            .limit(15)
        ]);

        setData({
          recentTenants: tenantsRes.data || [],
          activeSessions: sessionsRes.data || [],
          criticalNotifications: notificationsRes.data || [],
          systemAlerts: []
        });
      } catch (error) {
        console.error('Error fetching initial optimized data:', error);
      }
    };

    fetchInitialData();

    // Single consolidated real-time channel with filtering
    const consolidatedChannel = supabase
      .channel('optimized-dashboard-updates')
      // Tenant changes - only new tenants
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tenants'
      }, (payload) => {
        console.log('New tenant (optimized):', payload);
        
        setData(prev => ({
          ...prev,
          recentTenants: [payload.new, ...prev.recentTenants.slice(0, 9)]
        }));

        toast.success(`New tenant created: ${payload.new.name}`);
      })
      // Critical notifications only
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'platform_notifications',
        filter: 'severity=in.(error,warning)'
      }, (payload) => {
        console.log('Critical notification (optimized):', payload);
        
        const notification = payload.new;
        setData(prev => ({ 
          ...prev, 
          criticalNotifications: [notification, ...prev.criticalNotifications.slice(0, 14)]
        }));

        // Show toast notification based on severity
        const toastFn = notification.severity === 'error' ? toast.error : toast.warning;
        toastFn(notification.title, {
          description: notification.message
        });
      })
      // Active sessions - only status changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'active_sessions',
        filter: 'is_active=eq.true'
      }, (payload) => {
        setData(prev => {
          if (payload.eventType === 'INSERT') {
            return { 
              ...prev, 
              activeSessions: [payload.new, ...prev.activeSessions.slice(0, 19)]
            };
          } else if (payload.eventType === 'DELETE') {
            return { 
              ...prev, 
              activeSessions: prev.activeSessions.filter(s => s.id !== payload.old.id)
            };
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      console.log('Cleaning up optimized real-time subscriptions...');
      supabase.removeChannel(consolidatedChannel);
    };
  }, []);

  return data;
};
