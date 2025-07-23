
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export interface SessionData {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isTokenExpired: boolean;
  timeUntilExpiry: number | null;
  timeSinceLastActivity: number;
  profile: any;
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
    profile: null
  };
  private initialized = false;

  constructor() {
    this.initializeSession();
  }

  private async initializeSession() {
    if (this.initialized) return;
    
    try {
      console.log('Initializing session service...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
      } else {
        console.log('Initial session loaded:', session?.user?.email || 'No user');
        await this.updateSessionData(session);
      }
      
      this.setupAuthListener();
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing session:', error);
      this.initialized = true;
    }
  }

  private setupAuthListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_OUT') {
        await this.updateSessionData(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await this.updateSessionData(session);
      }
    });
  }

  private async updateSessionData(session: Session | null) {
    const isAuthenticated = !!session;
    const isTokenExpired = session ? new Date(session.expires_at! * 1000) < new Date() : false;
    
    let profile = null;
    if (session?.user) {
      // Create profile from user metadata and auth data
      profile = {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
        avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
        created_at: session.user.created_at,
        last_sign_in_at: session.user.last_sign_in_at,
        role: session.user.user_metadata?.role || 'user'
      };
    }
    
    this.sessionData = {
      user: session?.user || null,
      session,
      isAuthenticated,
      isTokenExpired,
      timeUntilExpiry: session ? new Date(session.expires_at! * 1000).getTime() - Date.now() : null,
      timeSinceLastActivity: Date.now() - (session?.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at).getTime() : 0),
      profile
    };

    this.notifySubscribers();
  }

  private notifySubscribers() {
    this.subscribers.forEach(subscriber => {
      try {
        subscriber(this.sessionData);
      } catch (error) {
        console.error('Error notifying subscriber:', error);
      }
    });
  }

  public subscribe(subscriber: SessionSubscriber): () => void {
    this.subscribers.push(subscriber);
    
    // Immediately notify with current session data
    if (this.initialized) {
      subscriber(this.sessionData);
    }
    
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== subscriber);
    };
  }

  public getSessionData(): SessionData {
    return this.sessionData;
  }

  public async signInWithSecurity(email: string, password: string): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim().toLowerCase(), 
        password 
      });

      if (error) {
        console.error('Sign in error:', error);
        return { data: null, error };
      }

      // Session will be updated automatically via auth state change listener
      return { data, error: null };
    } catch (error) {
      console.error('Sign in exception:', error);
      return { data: null, error };
    }
  }

  public async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      // Session will be updated automatically via auth state change listener
    } catch (error) {
      console.error('Sign out exception:', error);
    }
  }

  public async refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      // Session will be updated automatically via auth state change listener
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to refresh session' };
    }
  }
}

export const sessionService = new SessionService();
