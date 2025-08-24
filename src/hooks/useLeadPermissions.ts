
import { useState, useEffect } from 'react';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { supabase } from '@/integrations/supabase/client';
import type { Lead } from '@/types/leads';

interface LeadPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canConvert: boolean;
  restrictedFields: string[];
}

export const useLeadPermissions = (lead?: Lead) => {
  const [permissions, setPermissions] = useState<LeadPermissions>({
    canView: false,
    canEdit: false,
    canDelete: false,
    canAssign: false,
    canConvert: false,
    restrictedFields: [],
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const multiTenant = useMultiTenant();

  useEffect(() => {
    const fetchUserAndPermissions = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        if (!user) {
          setIsLoading(false);
          return;
        }

        // Get admin user details
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('role, is_active')
          .eq('id', user.id)
          .single();

        if (!adminUser || !adminUser.is_active) {
          setIsLoading(false);
          return;
        }

        // Calculate permissions based on role
        const newPermissions = calculatePermissions(adminUser.role, lead);
        setPermissions(newPermissions);
      } catch (error) {
        console.error('Error fetching user permissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAndPermissions();
  }, [lead, multiTenant]);

  const calculatePermissions = (role: string, lead?: Lead): LeadPermissions => {
    const basePermissions = {
      canView: true,
      canEdit: false,
      canDelete: false,
      canAssign: false,
      canConvert: false,
      restrictedFields: [] as string[],
    };

    switch (role) {
      case 'super_admin':
        return {
          ...basePermissions,
          canEdit: true,
          canDelete: true,
          canAssign: true,
          canConvert: true,
        };

      case 'platform_admin':
        return {
          ...basePermissions,
          canEdit: true,
          canDelete: false,
          canAssign: true,
          canConvert: true,
          restrictedFields: ['ai_score', 'ai_recommended_action'],
        };

      case 'admin':
        return {
          ...basePermissions,
          canEdit: true,
          canDelete: false,
          canAssign: false,
          canConvert: lead?.status === 'qualified',
          restrictedFields: ['ai_score', 'ai_recommended_action', 'lead_score'],
        };

      case 'sales_manager':
        return {
          ...basePermissions,
          canEdit: true,
          canDelete: false,
          canAssign: true,
          canConvert: lead?.status === 'qualified',
          restrictedFields: ['ai_score', 'ai_recommended_action', 'lead_score'],
        };

      case 'sales_rep':
        return {
          ...basePermissions,
          canEdit: lead?.assigned_to === currentUser?.id,
          canDelete: false,
          canAssign: false,
          canConvert: false,
          restrictedFields: ['ai_score', 'ai_recommended_action', 'lead_score', 'qualification_score'],
        };

      default:
        return basePermissions;
    }
  };

  const canAccessField = (fieldName: string): boolean => {
    return !permissions.restrictedFields.includes(fieldName);
  };

  const canPerformAction = (action: keyof Omit<LeadPermissions, 'restrictedFields'>): boolean => {
    return permissions[action];
  };

  return {
    permissions,
    canAccessField,
    canPerformAction,
    currentUser,
    isLoading,
  };
};
