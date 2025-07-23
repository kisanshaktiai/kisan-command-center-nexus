
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RealtimeData {
  tenants: any[];
  activeSessions: any[];
  apiUsage: any[];
  notifications: any[];
}

export const useRealtimeSubscriptions = () => {
  const [data, setData] = useState<RealtimeData>({
    tenants: [],
    activeSessions: [],
    apiUsage: [],
    notifications: []
  });

  useEffect(() => {
    // Initial data fetch
    const fetchInitialData = async () => {
      try {
        const [tenantsRes, sessionsRes, apiRes, notificationsRes] = await Promise.all([
          supabase.from('tenants').select('*').order('created_at', { ascending: false }),
          supabase.from('active_sessions').select('*').eq('is_active', true),
          supabase.from('api_logs').select('*').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('platform_notifications').select('*').eq('is_read', false).order('created_at', { ascending: false })
        ]);

        setData({
          tenants: tenantsRes.data || [],
          activeSessions: sessionsRes.data || [],
          apiUsage: apiRes.data || [],
          notifications: notificationsRes.data || []
        });
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();

    // Set up realtime subscriptions
    const tenantChannel = supabase
      .channel('tenants-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tenants'
      }, (payload) => {
        console.log('Tenant change:', payload);
        
        setData(prev => {
          if (payload.eventType === 'INSERT') {
            toast.success(`New tenant created: ${payload.new.name}`);
            return { ...prev, tenants: [payload.new, ...prev.tenants] };
          } else if (payload.eventType === 'DELETE') {
            toast.info(`Tenant deleted: ${payload.old.name}`);
            return { ...prev, tenants: prev.tenants.filter(t => t.id !== payload.old.id) };
          } else if (payload.eventType === 'UPDATE') {
            return { 
              ...prev, 
              tenants: prev.tenants.map(t => t.id === payload.new.id ? payload.new : t) 
            };
          }
          return prev;
        });
      })
      .subscribe();

    const sessionsChannel = supabase
      .channel('sessions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'active_sessions'
      }, (payload) => {
        setData(prev => {
          if (payload.eventType === 'INSERT') {
            return { ...prev, activeSessions: [...prev.activeSessions, payload.new] };
          } else if (payload.eventType === 'DELETE') {
            return { ...prev, activeSessions: prev.activeSessions.filter(s => s.id !== payload.old.id) };
          } else if (payload.eventType === 'UPDATE') {
            return { 
              ...prev, 
              activeSessions: prev.activeSessions.map(s => s.id === payload.new.id ? payload.new : s) 
            };
          }
          return prev;
        });
      })
      .subscribe();

    const apiLogsChannel = supabase
      .channel('api-logs-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'api_logs'
      }, (payload) => {
        setData(prev => ({ 
          ...prev, 
          apiUsage: [payload.new, ...prev.apiUsage.slice(0, 999)] // Keep last 1000 entries
        }));

        // Check for failed API calls and notify
        if (payload.new.status_code >= 400) {
          toast.error(`API call failed: ${payload.new.endpoint} (${payload.new.status_code})`);
        }
      })
      .subscribe();

    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'platform_notifications'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const notification = payload.new;
          setData(prev => ({ 
            ...prev, 
            notifications: [notification, ...prev.notifications] 
          }));

          // Show toast notification
          const toastFn = notification.severity === 'error' ? toast.error :
                         notification.severity === 'warning' ? toast.warning :
                         toast.info;
          
          toastFn(notification.title, {
            description: notification.message
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tenantChannel);
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(apiLogsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, []);

  return data;
};
