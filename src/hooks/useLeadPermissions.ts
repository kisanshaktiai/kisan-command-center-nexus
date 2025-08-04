
import { useMemo } from 'react';
import { useMultiTenant } from '@/hooks/useMultiTenant';

export interface LeadPermissions {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canConvert: boolean;
  canViewSensitiveFields: boolean;
  canBulkAction: boolean;
  canExport: boolean;
  canManageSettings: boolean;
}

export interface FieldPermissions {
  canView: boolean;
  canEdit: boolean;
  isRequired: boolean;
}

export const useLeadPermissions = () => {
  const { currentUser, currentTenant } = useMultiTenant();

  const permissions = useMemo((): LeadPermissions => {
    const userRole = currentUser?.role;
    const isActive = currentUser?.is_active;

    if (!isActive) {
      return {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canAssign: false,
        canConvert: false,
        canViewSensitiveFields: false,
        canBulkAction: false,
        canExport: false,
        canManageSettings: false,
      };
    }

    switch (userRole) {
      case 'super_admin':
      case 'platform_admin':
        return {
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
          canAssign: true,
          canConvert: true,
          canViewSensitiveFields: true,
          canBulkAction: true,
          canExport: true,
          canManageSettings: true,
        };

      case 'admin':
        return {
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: false,
          canAssign: true,
          canConvert: true,
          canViewSensitiveFields: true,
          canBulkAction: true,
          canExport: true,
          canManageSettings: false,
        };

      case 'manager':
        return {
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: false,
          canAssign: false,
          canConvert: false,
          canViewSensitiveFields: true,
          canBulkAction: false,
          canExport: true,
          canManageSettings: false,
        };

      case 'user':
      default:
        return {
          canCreate: false,
          canRead: true,
          canUpdate: false,
          canDelete: false,
          canAssign: false,
          canConvert: false,
          canViewSensitiveFields: false,
          canBulkAction: false,
          canExport: false,
          canManageSettings: false,
        };
    }
  }, [currentUser?.role, currentUser?.is_active]);

  const getFieldPermissions = useMemo(() => {
    return (fieldName: string): FieldPermissions => {
      const userRole = currentUser?.role;
      
      // Sensitive fields that require higher permissions
      const sensitiveFields = ['ai_score', 'ai_recommended_action', 'qualification_score', 'converted_tenant_id'];
      const isSensitive = sensitiveFields.includes(fieldName);

      if (isSensitive && !permissions.canViewSensitiveFields) {
        return {
          canView: false,
          canEdit: false,
          isRequired: false,
        };
      }

      // Read-only fields for certain roles
      const readOnlyFields = ['created_at', 'updated_at', 'lead_score', 'last_activity'];
      const isReadOnly = readOnlyFields.includes(fieldName);

      return {
        canView: permissions.canRead,
        canEdit: permissions.canUpdate && !isReadOnly,
        isRequired: ['contact_name', 'email'].includes(fieldName),
      };
    };
  }, [currentUser?.role, permissions]);

  return {
    permissions,
    getFieldPermissions,
  };
};
