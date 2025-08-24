import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';
import { AuthState, UserProfile } from '@/types/auth';

interface AuthStore extends AuthState {
  isLoading: boolean;
  error: string | null;
  
  // Actions - pure state management only
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setAuthState: (authState: Partial<AuthState>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
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
