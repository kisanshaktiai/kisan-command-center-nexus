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

export interface SendInvitationResponse {
  success: boolean;
  invitation_id?: string;
  email_id?: string;
  message?: string;
  warning?: string;
  error?: string;
  details?: string;
  code?: string;
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

  static async sendUserInvite(request: SendInvitationRequest): Promise<SendInvitationResponse> {
    try {
      console.log('InvitationService: Sending invite with request:', {
        tenantId: request.tenantId,
        email: request.email,
        role: request.role,
        firstName: request.firstName
      });

      // Get the current user to pass their ID in the request body
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('InvitationService: Current user ID:', user.id);

      // Include userId in the request body instead of headers
      const { data, error } = await supabase.functions.invoke('user-invitations', {
        body: {
          action: 'send',
          invitation_type: 'user',
          ...request,
          userId: user.id
        }
      });

      console.log('InvitationService: Edge function response:', { data, error });

      if (error) {
        console.error('InvitationService: Edge function error:', error);
        
        // Handle different types of errors
        let errorMessage = 'Failed to send invitation';
        
        if (error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error('No response data received from invitation service');
      }

      if (!data.success) {
        console.error('InvitationService: Invitation failed:', data);
        throw new Error(data.error || 'Unknown error occurred while sending invitation');
      }

      console.log('InvitationService: Invitation sent successfully:', data);
      return data;

    } catch (error) {
      console.error('InvitationService: Failed to send user invite:', error);
      
      // Return a structured error response
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        success: false,
        error: errorMessage
      };
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
