
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SystemRole, SystemRoleCode } from '@/types/roles';
import { toast } from 'sonner';

export const useSystemRoles = () => {
  return useQuery({
    queryKey: ['system-roles'],
    queryFn: async (): Promise<SystemRole[]> => {
      const { data, error } = await supabase
        .from('system_roles')
        .select('*')
        .eq('is_active', true)
        .order('role_level', { ascending: false });

      if (error) {
        console.error('Error fetching system roles:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSystemRole = (roleCode: SystemRoleCode) => {
  return useQuery({
    queryKey: ['system-role', roleCode],
    queryFn: async (): Promise<SystemRole | null> => {
      const { data, error } = await supabase
        .from('system_roles')
        .select('*')
        .eq('role_code', roleCode)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows found
        }
        console.error('Error fetching system role:', error);
        throw error;
      }

      return data;
    },
    enabled: !!roleCode,
  });
};

export const useCreateSystemRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleData: Omit<SystemRole, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('system_roles')
        .insert(roleData)
        .select()
        .single();

      if (error) {
        console.error('Error creating system role:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-roles'] });
      toast.success('System role created successfully');
    },
    onError: (error) => {
      console.error('Error creating system role:', error);
      toast.error('Failed to create system role');
    },
  });
};

export const useUpdateSystemRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      roleCode, 
      updates 
    }: { 
      roleCode: SystemRoleCode; 
      updates: Partial<Omit<SystemRole, 'id' | 'role_code' | 'created_at' | 'updated_at'>> 
    }) => {
      const { data, error } = await supabase
        .from('system_roles')
        .update(updates)
        .eq('role_code', roleCode)
        .select()
        .single();

      if (error) {
        console.error('Error updating system role:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-roles'] });
      queryClient.invalidateQueries({ queryKey: ['system-role', variables.roleCode] });
      toast.success('System role updated successfully');
    },
    onError: (error) => {
      console.error('Error updating system role:', error);
      toast.error('Failed to update system role');
    },
  });
};

export const useRolePermissions = (roleCode?: SystemRoleCode) => {
  return useQuery({
    queryKey: ['role-permissions', roleCode],
    queryFn: async (): Promise<string[]> => {
      if (!roleCode) return [];

      const { data, error } = await supabase
        .rpc('get_role_permissions', { p_role_code: roleCode });

      if (error) {
        console.error('Error fetching role permissions:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!roleCode,
  });
};

export const useRoleLevel = (roleCode?: SystemRoleCode) => {
  return useQuery({
    queryKey: ['role-level', roleCode],
    queryFn: async (): Promise<number> => {
      if (!roleCode) return 0;

      const { data, error } = await supabase
        .rpc('get_role_level', { p_role_code: roleCode });

      if (error) {
        console.error('Error fetching role level:', error);
        throw error;
      }

      return data || 0;
    },
    enabled: !!roleCode,
  });
};
