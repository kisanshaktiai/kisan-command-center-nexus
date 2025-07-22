
import { useEffect, useCallback } from 'react';

export const useSessionManagement = () => {
  const updateSessionActivity = useCallback(() => {
    const sessionToken = localStorage.getItem('admin_session_token');
    const sessionInfo = localStorage.getItem('admin_session_info');
    
    if (!sessionToken || !sessionInfo) return;

    try {
      const session = JSON.parse(sessionInfo);
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      
      // Check if session has expired
      if (now > expiresAt) {
        console.warn('Session has expired');
        localStorage.removeItem('admin_session_token');
        localStorage.removeItem('admin_session_info');
        return;
      }
      
      // Update last activity
      session.lastActivity = now.toISOString();
      
      // Extend expiration for non-remember sessions
      if (!session.rememberMe) {
        session.expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      }
      
      localStorage.setItem('admin_session_info', JSON.stringify(session));
      
      console.log('Session activity updated');
    } catch (error) {
      console.error('Failed to update session activity:', error);
      localStorage.removeItem('admin_session_token');
      localStorage.removeItem('admin_session_info');
    }
  }, []);

  const cleanupExpiredSessions = useCallback(() => {
    const sessionToken = localStorage.getItem('admin_session_token');
    const sessionInfo = localStorage.getItem('admin_session_info');
    
    if (!sessionToken || !sessionInfo) return;

    try {
      const session = JSON.parse(sessionInfo);
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      
      if (now > expiresAt) {
        localStorage.removeItem('admin_session_token');
        localStorage.removeItem('admin_session_info');
        console.log('Expired session cleaned up');
      }
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
      localStorage.removeItem('admin_session_token');
      localStorage.removeItem('admin_session_info');
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
