
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export interface SessionData {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isTokenExpired: boolean;
  timeUntilExpiry: number | null;
  timeSinceLastActivity: number;
  isAdmin: boolean;
  userRole: string | null;
}

type SessionSubscriber = (sessionData: SessionData) => void;

class SessionService {
  private subscribers: SessionSubscriber[] = [];
  private sessionData: SessionData = {
    user: null,
    session: null,
    isAuthenticated: false,
    isTokenExpired: false,
    timeUntilExpiry: null,
    timeSinceLastActivity: 0,
    isAdmin: false,
    userRole: null
  };

  constructor() {
    this.initializeSession();
  }

  private async initializeSession() {
    const { data: { session } } = await supabase.auth.getSession();
    await this.updateSessionData(session);
  }

  private async updateSessionData(session: Session | null) {
    const isAuthenticated = !!session;
    const isTokenExpired = session ? new Date(session.expires_at! * 1000) < new Date() : false;
    
    let isAdmin = false;
    let userRole: string | null = null;
    
    if (session?.user) {
      try {
        // Direct database query to check admin status
        const { data: adminData, error } = await supabase
          .from('admin_users')
          .select('role, is_active')
          .eq('id', session.user.id)
          .eq('is_active', true)
          .single();

        if (!error && adminData) {
          isAdmin = ['super_admin', 'platform_admin'].includes(adminData.role);
          userRole = adminData.role;
        }
        
        console.log('Admin check:', { 
          userId: session.user.id, 
          adminData,
          error,
          isAdmin,
          userRole 
        });
      } catch (error) {
        console.error('Error checking admin status:', error);
        isAdmin = false;
        userRole = null;
      }
    }

    this.sessionData = {
      user: session?.user || null,
      session,
      isAuthenticated,
      isTokenExpired,
      timeUntilExpiry: session ? new Date(session.expires_at! * 1000).getTime() - Date.now() : null,
      timeSinceLastActivity: Date.now() - (session?.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at).getTime() : 0),
      isAdmin,
      userRole
    };

    this.notifySubscribers();
  }

  private notifySubscribers() {
    this.subscribers.forEach(subscriber => subscriber(this.sessionData));
  }

  public subscribe(subscriber: SessionSubscriber): () => void {
    this.subscribers.push(subscriber);
    subscriber(this.sessionData);
    
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== subscriber);
    };
  }

  public getSessionData(): SessionData {
    return this.sessionData;
  }

  public isTokenExpired(): boolean {
    return this.sessionData.isTokenExpired;
  }

  public getTimeUntilExpiry(): number | null {
    return this.sessionData.timeUntilExpiry;
  }

  public getTimeSinceLastActivity(): number {
    return this.sessionData.timeSinceLastActivity;
  }

  public async refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      await this.updateSessionData(session);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to refresh session' };
    }
  }

  public async signOut(): Promise<void> {
    await supabase.auth.signOut();
    await this.updateSessionData(null);
  }

  public async isAdmin(): Promise<boolean> {
    if (!this.sessionData.user) return false;
    
    try {
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('id', this.sessionData.user.id)
        .eq('is_active', true)
        .single();

      if (!error && adminData) {
        return ['super_admin', 'platform_admin'].includes(adminData.role);
      }
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  public async getUserRole(): Promise<string | null> {
    if (!this.sessionData.user) return null;
    
    try {
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('role')
        .eq('id', this.sessionData.user.id)
        .eq('is_active', true)
        .single();

      if (!error && adminData) {
        return adminData.role;
      }
      return null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  // Simplified login security methods - basic implementation without account locking
  public async checkAccountLocked(email: string): Promise<boolean> {
    // Since we don't have account_locked_until column, always return false
    return false;
  }

  public async incrementFailedLogin(email: string): Promise<void> {
    // Since we don't have failed_login_attempts column, this is a no-op
    console.log('Failed login attempt for:', email);
  }

  public async resetFailedLogin(email: string): Promise<void> {
    // Since we don't have failed_login_attempts column, this is a no-op
    console.log('Resetting failed login for:', email);
  }

  public async signInWithSecurity(email: string, password: string): Promise<{ data: any; error: any }> {
    try {
      // Simple sign in without account locking since columns don't exist
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        await this.incrementFailedLogin(email);
        return { data: null, error };
      }

      // Reset failed login attempts on success
      await this.resetFailedLogin(email);
      await this.updateSessionData(data.session);
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

export const sessionService = new SessionService();
