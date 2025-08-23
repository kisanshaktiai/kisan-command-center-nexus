
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, TenantData } from '@/types/auth';
import { authService } from '@/services/AuthService';

interface AuthStore extends AuthState {
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, tenantData: TenantData) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
  setAuthState: (state: Partial<AuthState>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      isAuthenticated: false,
      isAdmin: false,
      isSuperAdmin: false,
      adminRole: null,
      profile: null,
      isLoading: false,
      error: null,

      // Actions
      initialize: async () => {
        set({ isLoading: true, error: null });
        try {
          const authState = await authService.getCurrentAuthState();
          set({
            user: authState.user,
            session: authState.session,
            isAuthenticated: authState.isAuthenticated,
            isAdmin: authState.isAdmin,
            isSuperAdmin: authState.isSuperAdmin,
            adminRole: authState.adminRole,
            profile: authState.profile,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to initialize auth',
            isLoading: false,
          });
        }
      },

      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.signIn(email, password);
          if (result.success && result.data) {
            set({
              user: result.data.user,
              session: result.data.session,
              isAuthenticated: result.data.isAuthenticated,
              isAdmin: result.data.isAdmin,
              isSuperAdmin: result.data.isSuperAdmin,
              adminRole: result.data.adminRole,
              profile: result.data.profile,
              isLoading: false,
            });
            return { success: true };
          } else {
            set({
              error: result.error || 'Sign in failed',
              isLoading: false,
            });
            return { success: false, error: result.error };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
          set({
            error: errorMessage,
            isLoading: false,
          });
          return { success: false, error: errorMessage };
        }
      },

      signUp: async (email: string, password: string, tenantData: TenantData) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.signUp(email, password, tenantData);
          if (result.success) {
            set({ isLoading: false });
            return { success: true };
          } else {
            set({
              error: result.error || 'Sign up failed',
              isLoading: false,
            });
            return { success: false, error: result.error };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
          set({
            error: errorMessage,
            isLoading: false,
          });
          return { success: false, error: errorMessage };
        }
      },

      signOut: async () => {
        set({ isLoading: true });
        try {
          await authService.signOut();
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isAdmin: false,
            isSuperAdmin: false,
            adminRole: null,
            profile: null,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Sign out failed',
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),

      setAuthState: (state: Partial<AuthState>) => {
        set((current) => ({
          ...current,
          user: state.user !== undefined ? state.user : current.user,
          session: state.session !== undefined ? state.session : current.session,
          isAuthenticated: state.isAuthenticated !== undefined ? state.isAuthenticated : current.isAuthenticated,
          isAdmin: state.isAdmin !== undefined ? state.isAdmin : current.isAdmin,
          isSuperAdmin: state.isSuperAdmin !== undefined ? state.isSuperAdmin : current.isSuperAdmin,
          adminRole: state.adminRole !== undefined ? state.adminRole : current.adminRole,
          profile: state.profile !== undefined ? state.profile : current.profile,
        }));
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
