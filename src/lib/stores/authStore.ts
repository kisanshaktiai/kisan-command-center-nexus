
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
            ...authState,
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
              ...result.data,
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
        set((current) => ({ ...current, ...state }));
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
