// Consolidated admin-related types
export type AdminRole = 'super_admin' | 'admin' | 'viewer';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface AdminInvite {
  id: string;
  email: string;
  role: AdminRole;
  status: InviteStatus;
  expires_at: string;
  invite_token: string;
  invited_by: string;
  created_at: string;
  updated_at?: string;
  accepted_at?: string;
  metadata?: {
    organizationName?: string;
    appLogo?: string;
    primaryColor?: string;
  };
}

export interface InviteAnalytics {
  invite_id: string;
  event_type: 'sent' | 'opened' | 'accepted' | 'expired';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  role: AdminRole;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateAdminInviteRequest {
  email: string;
  role: AdminRole;
  metadata?: AdminInvite['metadata'];
}

export interface AdminSession {
  id: string;
  user_id: string;
  device_info?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  last_activity: string;
  is_active: boolean;
}