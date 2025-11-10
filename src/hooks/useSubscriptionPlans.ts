import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];
type InsertSubscriptionPlan = Database['public']['Tables']['subscription_plans']['Insert'];
type UpdateSubscriptionPlan = Database['public']['Tables']['subscription_plans']['Update'];

export const useSubscriptionPlans = (filters?: {
  isActive?: boolean;
  isPublic?: boolean;
  tenantId?: string | null;
}) => {
  return useQuery({
    queryKey: ['subscription-plans', filters],
    queryFn: async () => {
      console.log('Fetching subscription plans with filters:', filters);
      
      let query = supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      // Apply filters
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      
      if (filters?.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }
      
      if (filters?.tenantId !== undefined) {
        if (filters.tenantId === null) {
          query = query.is('tenant_id', null);
        } else {
          query = query.eq('tenant_id', filters.tenantId);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching subscription plans:', error);
        throw error;
      }

      console.log('Fetched subscription plans:', data);
      return data as SubscriptionPlan[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateSubscriptionPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: InsertSubscriptionPlan) => {
      console.log('Creating subscription plan:', plan);
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert(plan)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Subscription plan created successfully');
    },
    onError: (error: Error) => {
      console.error('Error creating subscription plan:', error);
      toast.error('Failed to create subscription plan');
    },
  });
};

export const useUpdateSubscriptionPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateSubscriptionPlan }) => {
      console.log('Updating subscription plan:', id, updates);
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Subscription plan updated successfully');
    },
    onError: (error: Error) => {
      console.error('Error updating subscription plan:', error);
      toast.error('Failed to update subscription plan');
    },
  });
};

export const useDeleteSubscriptionPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting subscription plan:', id);
      
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Subscription plan deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Error deleting subscription plan:', error);
      toast.error('Failed to delete subscription plan');
    },
  });
};
