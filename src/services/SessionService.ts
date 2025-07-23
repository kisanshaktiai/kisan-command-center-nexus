
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
      // Check admin status using new consolidated functions
      const { data: adminData } = await supabase.rpc('is_platform_admin', { user_id: session.user.id });
      isAdmin = adminData || false;
      
      // Get user role
      const { data: roleData } = await supabase.rpc('get_user_role', { user_id: session.user.id });
      userRole = roleData;
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

  public async refreshSession(): Promise<void> {
    const { data: { session } } = await supabase.auth.refreshSession();
    await this.updateSessionData(session);
  }

  public async signOut(): Promise<void> {
    await supabase.auth.signOut();
    await this.updateSessionData(null);
  }

  public async isAdmin(): Promise<boolean> {
    if (!this.sessionData.user) return false;
    
    const { data } = await supabase.rpc('is_platform_admin', { user_id: this.sessionData.user.id });
    return data || false;
  }

  public async getUserRole(): Promise<string | null> {
    if (!this.sessionData.user) return null;
    
    const { data } = await supabase.rpc('get_user_role', { user_id: this.sessionData.user.id });
    return data;
  }

  // Enhanced login security methods
  public async checkAccountLocked(email: string): Promise<boolean> {
    const { data } = await supabase.rpc('is_account_locked', { user_email: email });
    return data || false;
  }

  public async incrementFailedLogin(email: string): Promise<void> {
    await supabase.rpc('increment_failed_login', { user_email: email });
  }

  public async resetFailedLogin(email: string): Promise<void> {
    await supabase.rpc('reset_failed_login', { user_email: email });
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
