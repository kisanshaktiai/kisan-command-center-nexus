
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserTenantService } from '@/services/UserTenantService';

export const useTenantUserManagement = () => {
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isFixingRelationship, setIsFixingRelationship] = useState(false);

  const checkUserExists = async (email: string) => {
    if (!email) return null;
    
    setIsCheckingUser(true);
    try {
      console.log('useTenantUserManagement: Checking user exists for:', email);
      
      const { data, error } = await supabase.functions.invoke('check-user-exists', {
        body: { email }
      });

      if (error) {
        console.error('useTenantUserManagement: Error checking user:', error);
        toast.error('Failed to check user status');
        return null;
      }

      return data;
    } catch (error) {
      console.error('useTenantUserManagement: Unexpected error:', error);
      toast.error('Network error occurred. Please check your connection.');
      return null;
    } finally {
      setIsCheckingUser(false);
    }
  };

  const checkUserTenantStatus = async (email: string, tenantId: string) => {
    if (!email || !tenantId) return null;
    
    setIsCheckingStatus(true);
    try {
      console.log('useTenantUserManagement: Checking user-tenant status for:', { email, tenantId });
      
      const status = await UserTenantService.checkUserTenantStatus(email, tenantId);
      console.log('useTenantUserManagement: Status check result:', status);
      
      return status;
    } catch (error) {
      console.error('useTenantUserManagement: Error checking status:', error);
      toast.error('Failed to check user-tenant status');
      return null;
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const createAdminUser = async (email: string, fullName: string, tenantId: string) => {
    if (!email || !fullName || !tenantId) {
      toast.error('All fields are required');
      return null;
    }

    setIsCreatingUser(true);
    try {
      console.log('useTenantUserManagement: Creating admin user:', { email, fullName, tenantId });
      
      const { data, error } = await supabase.functions.invoke('create-tenant-admin', {
        body: { 
          email, 
          fullName, 
          tenantId 
        }
      });

      if (error) {
        console.error('useTenantUserManagement: Error creating user:', error);
        toast.error('Failed to create admin user');
        return null;
      }

      if (data?.success) {
        toast.success('Admin user created successfully');
        return data;
      } else {
        toast.error(data?.error || 'Failed to create admin user');
        return null;
      }
    } catch (error) {
      console.error('useTenantUserManagement: Unexpected error creating user:', error);
      toast.error('Network error occurred while creating user');
      return null;
    } finally {
      setIsCreatingUser(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    if (!email) {
      toast.error('Email is required');
      return false;
    }

    setIsSendingReset(true);
    try {
      console.log('useTenantUserManagement: Sending password reset for:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        console.error('useTenantUserManagement: Error sending reset:', error);
        toast.error('Failed to send password reset email');
        return false;
      }

      toast.success('Password reset email sent successfully');
      return true;
    } catch (error) {
      console.error('useTenantUserManagement: Unexpected error sending reset:', error);
      toast.error('Network error occurred while sending reset email');
      return false;
    } finally {
      setIsSendingReset(false);
    }
  };

  return {
    checkUserExists,
    checkUserTenantStatus,
    createAdminUser,
    sendPasswordReset,
    isCheckingUser,
    isCreatingUser,
    isSendingReset,
    isCheckingStatus,
    isFixingRelationship
  };
};
