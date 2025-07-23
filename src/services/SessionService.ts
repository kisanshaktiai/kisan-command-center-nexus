
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export interface SessionData {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isTokenExpired: boolean;
  timeUntilExpiry: number | null;
  timeSinceLastActivity: number;
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
    timeSinceLastActivity: 0
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
    
    this.sessionData = {
      user: session?.user || null,
      session,
      isAuthenticated,
      isTokenExpired,
      timeUntilExpiry: session ? new Date(session.expires_at! * 1000).getTime() - Date.now() : null,
      timeSinceLastActivity: Date.now() - (session?.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at).getTime() : 0)
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

  public async signInWithSecurity(email: string, password: string): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return { data: null, error };
      }

      await this.updateSessionData(data.session);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

export const sessionService = new SessionService();
