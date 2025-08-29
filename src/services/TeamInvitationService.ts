
import { supabase } from '@/integrations/supabase/client';

export interface TeamInvitationData {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  role: string;
  tenant_id: string;
  expires_at: string;
  status: string;
  tenant_name?: string;
  inviter_name?: string;
  created_at: string;
}

export interface ValidateTeamInvitationResponse {
  success: boolean;
  valid: boolean;
  invitation?: TeamInvitationData;
  expired?: boolean;
  already_accepted?: boolean;
  error?: string;
}

export interface SendTeamInvitationRequest {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantName?: string;
  inviterName?: string;
}

export interface SendTeamInvitationResponse {
  success: boolean;
  invitationId?: string;
  inviteUrl?: string;
  message?: string;
  error?: string;
}

export class TeamInvitationService {
  static async validateInvitationToken(token: string): Promise<ValidateTeamInvitationResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('validate-team-invitation', {
        body: { token }
      });

      if (error) {
        console.error('Error validating team invitation:', error);
        return {
          success: false,
          valid: false,
          error: error.message
        };
      }

      return data;
    } catch (error) {
      console.error('Failed to validate team invitation token:', error);
      return {
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to validate invitation'
      };
    }
  }

  static async sendTeamInvite(request: SendTeamInvitationRequest): Promise<SendTeamInvitationResponse> {
    try {
      console.log('TeamInvitationService: Sending team invite with request:', {
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

      console.log('TeamInvitationService: Current user ID:', user.id);

      // Call the new team invitation edge function
      const { data, error } = await supabase.functions.invoke('send-team-invite', {
        body: {
          ...request,
          userId: user.id
        }
      });

      console.log('TeamInvitationService: Edge function response:', { data, error });

      if (error) {
        console.error('TeamInvitationService: Edge function error:', error);
        throw new Error(error.message || 'Failed to send team invitation');
      }

      if (!data) {
        throw new Error('No response data received from team invitation service');
      }

      if (!data.success) {
        console.error('TeamInvitationService: Team invitation failed:', data);
        throw new Error(data.error || 'Unknown error occurred while sending team invitation');
      }

      console.log('TeamInvitationService: Team invitation sent successfully:', data);
      return data;

    } catch (error) {
      console.error('TeamInvitationService: Failed to send team invite:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  static async markInvitationClicked(token: string): Promise<boolean> {
    try {
      // Direct database update since we have the function in the database
      const { data, error } = await supabase
        .from('team_invitations')
        .update({ 
          status: 'clicked', 
          clicked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('invitation_token', token)
        .eq('status', 'sent')
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error marking team invitation as clicked:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to mark team invitation as clicked:', error);
      return false;
    }
  }

  static async markInvitationAccepted(token: string): Promise<boolean> {
    try {
      // Direct database update since we have the function in the database
      const { data, error } = await supabase
        .from('team_invitations')
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('invitation_token', token)
        .in('status', ['sent', 'clicked'])
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error marking team invitation as accepted:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to mark team invitation as accepted:', error);
      return false;
    }
  }

  static async getTeamInvitations(tenantId: string): Promise<TeamInvitationData[]> {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching team invitations:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch team invitations:', error);
      throw error;
    }
  }
}
