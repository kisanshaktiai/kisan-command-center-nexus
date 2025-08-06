
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { CustomFieldConfig } from '@/types/leads';

export const useCustomFields = (tenantId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`custom-fields-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_custom_fields',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['custom-fields', tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  return useQuery({
    queryKey: ['custom-fields', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('lead_custom_fields')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('field_order', { ascending: true });

      if (error) throw error;
      return data as CustomFieldConfig[];
    },
    enabled: !!tenantId,
  });
};

export const useCreateCustomField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (field: Omit<CustomFieldConfig, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lead_custom_fields')
        .insert(field)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', data.tenant_id] });
    },
  });
};

export const useUpdateCustomField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CustomFieldConfig> }) => {
      const { data, error } = await supabase
        .from('lead_custom_fields')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', data.tenant_id] });
    },
  });
};

export const useDeleteCustomField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get field info first
      const { data: field } = await supabase
        .from('lead_custom_fields')
        .select('tenant_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('lead_custom_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return field?.tenant_id;
    },
    onSuccess: (tenantId) => {
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: ['custom-fields', tenantId] });
      }
    },
  });
};
