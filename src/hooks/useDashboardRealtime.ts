
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeDashboardData {
  activeSessions: any[];
  unreadNotifications: any[];
  recentApiLogs: any[];
}

export const useDashboardRealtime = () => {
  const [realtimeData, setRealtimeData] = useState<RealtimeDashboardData>({
    activeSessions: [],
    unreadNotifications: [],
    recentApiLogs: []
  });

  useEffect(() => {
    console.log('Setting up dashboard real-time subscriptions...');
    
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'platform_notifications'
      }, (payload) => {
        console.log('New notification:', payload);
        setRealtimeData(prev => ({
          ...prev,
          unreadNotifications: [payload.new, ...prev.unreadNotifications.slice(0, 19)]
        }));
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'active_sessions'
      }, (payload) => {
        console.log('Session update:', payload);
        if (payload.eventType === 'INSERT') {
          setRealtimeData(prev => ({
            ...prev,
            activeSessions: [payload.new, ...prev.activeSessions.slice(0, 49)]
          }));
        } else if (payload.eventType === 'DELETE') {
          setRealtimeData(prev => ({
            ...prev,
            activeSessions: prev.activeSessions.filter(s => s.id !== payload.old.id)
          }));
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'api_logs'
      }, (payload) => {
        if (payload.new.status_code >= 400) {
          console.log('API failure:', payload);
          setRealtimeData(prev => ({
            ...prev,
            recentApiLogs: [payload.new, ...prev.recentApiLogs.slice(0, 99)]
          }));
        }
      })
      .subscribe();

    return () => {
      console.log('Cleaning up dashboard real-time subscriptions...');
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    realtimeData,
    hasRealtimeUpdates: Object.values(realtimeData).some(arr => arr.length > 0)
  };
};
