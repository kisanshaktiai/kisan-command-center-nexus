
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
        // Check for super admin first, then platform admin
        const { data: superAdminData } = await supabase.rpc('is_super_admin' as any, { user_id: session.user.id });
        const { data: platformAdminData } = await supabase.rpc('is_platform_admin' as any, { user_id: session.user.id });
        
        isAdmin = Boolean(superAdminData || platformAdminData);
        
        // Get user role
        const { data: roleData } = await supabase.rpc('get_user_role' as any, { user_id: session.user.id });
        userRole = roleData as string | null;
        
        console.log('Admin check:', { 
          userId: session.user.id, 
          superAdmin: superAdminData, 
          platformAdmin: platformAdminData, 
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
      const { data: superAdminData } = await supabase.rpc('is_super_admin' as any, { user_id: this.sessionData.user.id });
      const { data: platformAdminData } = await supabase.rpc('is_platform_admin' as any, { user_id: this.sessionData.user.id });
      return Boolean(superAdminData || platformAdminData);
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  public async getUserRole(): Promise<string | null> {
    if (!this.sessionData.user) return null;
    
    try {
      const { data } = await supabase.rpc('get_user_role' as any, { user_id: this.sessionData.user.id });
      return data as string | null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  // Enhanced login security methods
  public async checkAccountLocked(email: string): Promise<boolean> {
    try {
      const { data } = await supabase.rpc('is_account_locked' as any, { user_email: email });
      return Boolean(data);
    } catch (error) {
      console.error('Error checking account lock status:', error);
      return false;
    }
  }

  public async incrementFailedLogin(email: string): Promise<void> {
    try {
      await supabase.rpc('increment_failed_login' as any, { user_email: email });
    } catch (error) {
      console.error('Error incrementing failed login:', error);
    }
  }

  public async resetFailedLogin(email: string): Promise<void> {
    try {
      await supabase.rpc('reset_failed_login' as any, { user_email: email });
    } catch (error) {
      console.error('Error resetting failed login:', error);
    }
  }

  public async signInWithSecurity(email: string, password: string): Promise<{ data: any; error: any }> {
    try {
      // Check if account is locked
      const isLocked = await this.checkAccountLocked(email);
      if (isLocked) {
        return {
          data: null,
          error: { message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.' }
        };
      }

      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // Increment failed login attempts
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
