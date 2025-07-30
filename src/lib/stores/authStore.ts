
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';
import { AuthState, UserProfile, TenantData } from '@/types/auth';

interface AuthStore extends AuthState {
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setAuthState: (authState: Partial<AuthState>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, tenantData: TenantData) => Promise<{ data?: any; error?: any }>;
}

const initialState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isAdmin: false,
  isSuperAdmin: false,
  adminRole: null,
  profile: null,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      isLoading: true,
      error: null,

      setUser: (user) => set((state) => ({
        user,
        isAuthenticated: !!user,
        // Keep other auth state if user is being updated
        isAdmin: user ? state.isAdmin : false,
        isSuperAdmin: user ? state.isSuperAdmin : false,
        adminRole: user ? state.adminRole : null,
      })),

      setSession: (session) => set({
        session,
        user: session?.user || null,
        isAuthenticated: !!session,
      }),

      setAuthState: (authState) => set((state) => ({
        ...state,
        ...authState,
      })),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      reset: () => set({
        ...initialState,
        isLoading: false,
        error: null,
      }),

      signOut: async () => {
        const { unifiedAuthService } = await import('@/lib/services/unifiedAuthService');
        await unifiedAuthService.signOut();
      },

      signUp: async (email: string, password: string, tenantData: TenantData) => {
        try {
          set({ isLoading: true, error: null });
          
          const { unifiedAuthService } = await import('@/lib/services/unifiedAuthService');
          const result = await unifiedAuthService.signUp(email, password, tenantData);
          
          if (result.success && result.data) {
            return { data: result.data };
          } else {
            const error = new Error(result.error || 'Registration failed');
            set({ error: result.error || 'Registration failed' });
            return { error };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          set({ error: errorMessage });
          return { error: new Error(errorMessage) };
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
        isSuperAdmin: state.isSuperAdmin,
        adminRole: state.adminRole,
        profile: state.profile,
      }),
    }
  )
);
