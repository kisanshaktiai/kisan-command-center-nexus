
import { User, Session } from '@supabase/supabase-js';

// Re-export User from Supabase
export type { User } from '@supabase/supabase-js';

// Consolidated AuthState interface - single source of truth
export interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: string | null;
  profile: UserProfile | null;
}

export interface UserProfile {
  id: string;
  full_name?: string;
  email: string;
  mobile_number?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantData {
  organizationName: string;
  organizationType: string;
  tenantId?: string;
  fullName: string;
  phone: string;
}

export interface AuthResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AdminStatus {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: string | null;
}

export interface AuthError {
  message: string;
  status?: number;
  code?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends SignInCredentials {
  tenantData: TenantData;
}

export interface AdminInvite {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  invite_token: string;
  invited_by: string;
  created_at: string;
  updated_at: string;
}

export interface BootstrapData {
  email: string;
  password: string;
  fullName: string;
}

// New types for database function responses
export interface AdminStatusResult {
  is_admin: boolean;
  role: string;
  is_active: boolean;
}

export interface BootstrapStatusResult {
  bootstrap_needed: boolean;
}

// Type for supabase RPC calls that our functions should use
export interface SupabaseRpcResponse<T> {
  data: T | null;
  error: any;
}

// Auth context type
export interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, tenantData: TenantData) => Promise<{ data?: any; error?: any }>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

// Additional types for compatibility
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AdminRegistrationData {
  email: string;
  full_name: string;
  token: string;
  password?: string;
  role?: string;
}

export interface SuperAdminSetupData {
  email: string;
  password: string;
  full_name: string;
}
