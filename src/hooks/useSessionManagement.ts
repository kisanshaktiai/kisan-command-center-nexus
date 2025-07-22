
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSessionManagement = () => {
  const updateSessionActivity = useCallback(async () => {
    const sessionToken = localStorage.getItem('admin_session_token');
    if (!sessionToken) return;

    try {
      const { data, error } = await supabase
        .from('admin_sessions')
        .update({ 
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now
        })
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .select();

      if (error || !data || data.length === 0) {
        console.warn('Session may have expired');
        localStorage.removeItem('admin_session_token');
      }
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }, []);

  const cleanupExpiredSessions = useCallback(async () => {
    try {
      await supabase
        .from('admin_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }, []);

  // Update session activity on user interaction
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const activityHandler = () => {
      updateSessionActivity();
    };

    // Update session activity every 5 minutes of user activity
    const intervalId = setInterval(() => {
      updateSessionActivity();
    }, 5 * 60 * 1000);

    events.forEach(event => {
      document.addEventListener(event, activityHandler, true);
    });

    // Cleanup expired sessions every hour
    const cleanupIntervalId = setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
      clearInterval(cleanupIntervalId);
      events.forEach(event => {
        document.removeEventListener(event, activityHandler, true);
      });
    };
  }, [updateSessionActivity, cleanupExpiredSessions]);

  return {
    updateSessionActivity,
    cleanupExpiredSessions
  };
};
