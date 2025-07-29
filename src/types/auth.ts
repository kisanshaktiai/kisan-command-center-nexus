export interface AuthUser {
  id: string;
  email: string | undefined;
  phone?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
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
  name: string;
  slug: string;
  type: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
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