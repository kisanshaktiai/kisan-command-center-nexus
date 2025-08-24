
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminStatus {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: string | null;
}

export const useAdminStatus = () => {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    isAdmin: false,
    isSuperAdmin: false,
    adminRole: null,
  });

  const checkAdminStatus = useCallback(async (userId: string): Promise<AdminStatus> => {
    try {
      // Query the admin_users table which has the is_active field
      const { data, error } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('useAdminStatus: Admin status check error:', error);
        const status = { isAdmin: false, isSuperAdmin: false, adminRole: null };
        setAdminStatus(status);
        return status;
      }

      if (!data || !data.is_active) {
        const status = { isAdmin: false, isSuperAdmin: false, adminRole: null };
        setAdminStatus(status);
        return status;
      }

      const status = {
        isAdmin: true,
        isSuperAdmin: data.role === 'super_admin',
        adminRole: data.role
      };
      
      setAdminStatus(status);
      return status;
    } catch (error) {
      console.error('useAdminStatus: Failed to check admin status:', error);
      const status = { isAdmin: false, isSuperAdmin: false, adminRole: null };
      setAdminStatus(status);
      return status;
    }
  }, []);

  return {
    adminStatus,
    checkAdminStatus,
  };
};
