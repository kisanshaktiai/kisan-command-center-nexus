import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';

interface InviteData {
  valid: boolean;
  email: string;
  role: string;
  expiry: string;
  organizationName?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface AcceptInviteData {
  token: string;
  fullName: string;
  password: string;
  phone?: string;
}

/**
 * Invite Verification Service
 * Handles all invite-related business logic
 */
export class InviteVerificationService extends BaseService {
  private static instance: InviteVerificationService;

  private constructor() {
    super();
  }

  public static getInstance(): InviteVerificationService {
    if (!InviteVerificationService.instance) {
      InviteVerificationService.instance = new InviteVerificationService();
    }
    return InviteVerificationService.instance;
  }

  /**
   * Verify invite token and get invite details
   */
  async verifyInviteToken(token: string): Promise<ServiceResult<InviteData>> {
    return this.executeOperation(async () => {
      if (!token?.trim()) {
        throw new Error('Invite token is required');
      }

      const { data, error } = await supabase.functions.invoke('verify-admin-invite', {
        body: { token }
      });

      if (error) {
        throw new Error(error.message || 'Failed to verify invite');
      }

      if (!data?.valid) {
        throw new Error(data?.error || 'Invalid or expired invitation');
      }

      return {
        valid: data.valid,
        email: data.email,
        role: data.role,
        expiry: data.expiry,
        organizationName: data.metadata?.organizationName,
        primaryColor: data.metadata?.primaryColor,
        secondaryColor: data.metadata?.secondaryColor
      };
    }, 'verifyInviteToken');
  }

  /**
   * Accept invite and complete registration
   */
  async acceptInvite(inviteData: AcceptInviteData): Promise<ServiceResult<any>> {
    return this.executeOperation(async () => {
      // Validate required fields
      if (!inviteData.token?.trim()) {
        throw new Error('Invite token is required');
      }
      if (!inviteData.fullName?.trim()) {
        throw new Error('Full name is required');
      }
      if (!inviteData.password) {
        throw new Error('Password is required');
      }

      const { data, error } = await supabase.functions.invoke('verify-admin-invite/accept', {
        body: {
          token: inviteData.token,
          fullName: inviteData.fullName.trim(),
          password: inviteData.password,
          phone: inviteData.phone?.trim() || undefined
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to complete registration');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Registration failed');
      }

      return data;
    }, 'acceptInvite');
  }

  /**
   * Format role for display
   */
  formatRole(role: string): string {
    const roleMap: Record<string, string> = {
      'super_admin': 'Super Admin',
      'platform_admin': 'Platform Admin',
      'admin': 'Admin',
      'tenant_admin': 'Tenant Admin'
    };
    return roleMap[role] || role;
  }

  /**
   * Calculate time remaining until expiry
   */
  getExpiryTimeLeft(expiryDate: string): string {
    try {
      const now = new Date();
      const expiry = new Date(expiryDate);
      const diffMs = expiry.getTime() - now.getTime();

      if (diffMs <= 0) {
        return 'Expired';
      }

      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHours > 24) {
        const days = Math.floor(diffHours / 24);
        return `${days} day${days > 1 ? 's' : ''} remaining`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
      } else {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} remaining`;
      }
    } catch (error) {
      console.error('Error calculating expiry time:', error);
      return 'Invalid date';
    }
  }

  /**
   * Validate invite token format
   */
  validateTokenFormat(token: string): boolean {
    // Basic token format validation
    return token && token.length > 10 && /^[A-Za-z0-9+/=_-]+$/.test(token);
  }
}

export const inviteVerificationService = InviteVerificationService.getInstance();