
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

export interface SessionData {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  tokenExpiresAt: number | null;
}

class SessionService {
  private static instance: SessionService;
  private sessionData: SessionData = {
    user: null,
    session: null,
    isAuthenticated: false,
    tokenExpiresAt: null
  };
  private refreshTimer: NodeJS.Timeout | null = null;
  private listeners: ((sessionData: SessionData) => void)[] = [];

  private constructor() {
    this.initializeSession();
    this.setupAuthListener();
  }

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  private async initializeSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        return;
      }
      
      this.updateSessionData(session);
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }

  private setupAuthListener() {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      this.updateSessionData(session);
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
      
      if (event === 'SIGNED_OUT') {
        this.clearRefreshTimer();
      }
    });
  }

  private updateSessionData(session: Session | null) {
    this.sessionData = {
      user: session?.user || null,
      session: session,
      isAuthenticated: !!session,
      tokenExpiresAt: session?.expires_at ? session.expires_at * 1000 : null
    };

    // Set up token refresh timer
    if (session?.expires_at) {
      this.setupTokenRefresh(session.expires_at * 1000);
    }

    // Notify listeners
    this.notifyListeners();
  }

  private setupTokenRefresh(expiresAt: number) {
    this.clearRefreshTimer();
    
    // Refresh token 5 minutes before expiration
    const refreshTime = expiresAt - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(async () => {
        try {
          console.log('Refreshing token...');
          const { error } = await supabase.auth.refreshSession();
          if (error) {
            console.error('Error refreshing token:', error);
          }
        } catch (error) {
          console.error('Error in token refresh:', error);
        }
      }, refreshTime);
    }
  }

  private clearRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.sessionData));
  }

  // Public methods
  getSessionData(): SessionData {
    return { ...this.sessionData };
  }

  isTokenExpired(): boolean {
    if (!this.sessionData.tokenExpiresAt) return false;
    return Date.now() >= this.sessionData.tokenExpiresAt;
  }

  getTimeUntilExpiry(): number {
    if (!this.sessionData.tokenExpiresAt) return 0;
    return Math.max(0, this.sessionData.tokenExpiresAt - Date.now());
  }

  async refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to refresh session' };
    }
  }

  async signOut(): Promise<void> {
    this.clearRefreshTimer();
    await supabase.auth.signOut();
  }

  subscribe(listener: (sessionData: SessionData) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Helper method to check if user has admin role
  async isAdmin(): Promise<boolean> {
    if (!this.sessionData.isAuthenticated || !this.sessionData.user) {
      return false;
    }

    try {
      // Check if user exists in admin_users table
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, role, is_active')
        .eq('id', this.sessionData.user.id)
        .single();

      if (error || !data) {
        return false;
      }

      return data.is_active && ['super_admin', 'platform_admin', 'admin'].includes(data.role);
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }
}

export const sessionService = SessionService.getInstance();
