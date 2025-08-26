
import { supabase } from '@/integrations/supabase/client';

export interface InvitationData {
  id: string;
  email: string;
  invited_name: string;
  role: string;
  tenant_id: string;
  expires_at: string;
  status: string;
}

export interface ValidateInvitationResponse {
  success: boolean;
  valid: boolean;
  invitation?: InvitationData;
  expired?: boolean;
  already_accepted?: boolean;
  error?: string;
}

export interface SendInvitationRequest {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantName?: string;
  inviterName?: string;
}

export class InvitationService {
  static async validateInvitationToken(token: string): Promise<ValidateInvitationResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('validate-invitation', {
        body: { token }
      });

      if (error) {
        console.error('Error validating invitation:', error);
        return {
          success: false,
          valid: false,
          error: error.message
        };
      }

      return data;
    } catch (error) {
      console.error('Failed to validate invitation token:', error);
      return {
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to validate invitation'
      };
    }
  }

  static async sendUserInvite(request: SendInvitationRequest) {
    try {
      const { data, error } = await supabase.functions.invoke('send-user-invite', {
        body: request
      });

      if (error) {
        console.error('Error sending user invite:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Failed to send user invite:', error);
      throw error;
    }
  }

  static async markInvitationClicked(token: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .update({ 
          status: 'clicked',
          clicked_at: new Date().toISOString()
        })
        .eq('invitation_token', token)
        .eq('status', 'sent');

      if (error) {
        console.error('Error marking invitation as clicked:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to mark invitation as clicked:', error);
      return false;
    }
  }

  static async markInvitationAccepted(token: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('invitation_token', token)
        .in('status', ['sent', 'clicked']);

      if (error) {
        console.error('Error marking invitation as accepted:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to mark invitation as accepted:', error);
      return false;
    }
  }

  static async getUserInvitations(tenantId: string) {
    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user invitations:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch user invitations:', error);
      throw error;
    }
  }
}
