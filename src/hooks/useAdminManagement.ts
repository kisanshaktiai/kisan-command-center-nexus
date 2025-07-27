
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useAdminManagement = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if user is in admin_users table
        const { data: adminUser, error } = await supabase
          .from('admin_users')
          .select('role, is_active')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking admin access:', error);
          setHasAdminAccess(false);
          setUserRole(null);
        } else if (adminUser) {
          setHasAdminAccess(adminUser.is_active);
          setUserRole(adminUser.role);
          
          // If user is not in admin_users but is authenticated, create entry
          if (!adminUser.is_active) {
            toast.error('Your admin account is deactivated. Please contact support.');
          }
        } else {
          // User is not in admin_users table, try to create entry if they're a super admin
          if (user.email === 'kisanshaktiai@gmail.com') {
            await createSuperAdminEntry();
          } else {
            setHasAdminAccess(false);
            setUserRole(null);
          }
        }
      } catch (error) {
        console.error('Error in admin access check:', error);
        setHasAdminAccess(false);
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [user]);

  const createSuperAdminEntry = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('admin_users')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || 'Super Admin',
          role: 'super_admin',
          is_active: true
        });

      if (error) {
        console.error('Error creating super admin entry:', error);
        toast.error('Failed to create admin entry. Please contact support.');
      } else {
        setHasAdminAccess(true);
        setUserRole('super_admin');
        toast.success('Admin access granted successfully!');
      }
    } catch (error) {
      console.error('Error creating super admin entry:', error);
      toast.error('Failed to create admin entry. Please contact support.');
    }
  };

  const ensureTenantAccess = async () => {
    if (!user || !hasAdminAccess) return false;

    try {
      // Check if user has tenant access
      const { data: tenantAccess, error } = await supabase
        .from('user_tenants')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error checking tenant access:', error);
        return false;
      }

      if (!tenantAccess || tenantAccess.length === 0) {
        // Create default tenant access for super admin
        if (userRole === 'super_admin') {
          const { error: insertError } = await supabase
            .from('user_tenants')
            .insert({
              user_id: user.id,
              tenant_id: '00000000-0000-0000-0000-000000000000', // Default tenant
              role: 'super_admin',
              is_active: true
            });

          if (insertError) {
            console.error('Error creating tenant access:', insertError);
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error ensuring tenant access:', error);
      return false;
    }
  };

  return {
    isLoading,
    hasAdminAccess,
    userRole,
    ensureTenantAccess
  };
};
