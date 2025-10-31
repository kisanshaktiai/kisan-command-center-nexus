// Core billing hooks for plans, subscriptions, transactions

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  Plan, 
  Subscription, 
  Transaction, 
  Payout,
  CreatePlanRequest,
  CreateSubscriptionRequest,
  CreateTransactionRequest 
} from '@/types/billing/unified';

// ============= PLANS =============

export function usePlans(tenantId?: string) {
  return useQuery({
    queryKey: ['plans', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('plans')
        .select('*')
        .eq('archived', false)
        .order('sort_order', { ascending: true });

      if (tenantId) {
        query = query.or(`tenant_id.eq.${tenantId},is_global.eq.true`);
      } else {
        query = query.eq('is_global', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Plan[];
    },
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: CreatePlanRequest) => {
      const { data, error } = await supabase
        .from('plans')
        .insert(plan)
        .select()
        .single();

      if (error) throw error;
      return data as Plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create plan: ${error.message}`);
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Plan> }) => {
      const { data, error } = await supabase
        .from('plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update plan: ${error.message}`);
    },
  });
}

// ============= SUBSCRIPTIONS =============

export function useSubscriptions(filters?: { farmerId?: string; tenantId?: string }) {
  return useQuery({
    queryKey: ['subscriptions', filters],
    queryFn: async () => {
      let query = supabase
        .from('subscriptions')
        .select(`
          *,
          farmer:farmers(id, farmer_name, mobile_number),
          tenant:tenants(id, name),
          plan:plans(id, title, price, currency, duration_days)
        `)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (filters?.farmerId) {
        query = query.eq('farmer_id', filters.farmerId);
      }
      if (filters?.tenantId) {
        query = query.eq('tenant_id', filters.tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useActiveSubscriptions(tenantId?: string) {
  return useQuery({
    queryKey: ['active-subscriptions', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('active_subscriptions')
        .select('*');

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscription: CreateSubscriptionRequest) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscription)
        .select()
        .single();

      if (error) throw error;
      return data as Subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['active-subscriptions'] });
      toast.success('Subscription created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create subscription: ${error.message}`);
    },
  });
}

// ============= TRANSACTIONS =============

export function useTransactions(filters?: { tenantId?: string; farmerId?: string }) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          subscription:subscriptions(id, plan_id),
          tenant:tenants(id, name),
          farmer:farmers(id, farmer_name, mobile_number)
        `)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (filters?.tenantId) {
        query = query.eq('tenant_id', filters.tenantId);
      }
      if (filters?.farmerId) {
        query = query.eq('farmer_id', filters.farmerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: CreateTransactionRequest) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction recorded');
    },
    onError: (error: any) => {
      toast.error(`Failed to record transaction: ${error.message}`);
    },
  });
}

// ============= PAYOUTS =============

export function usePayouts(tenantId?: string) {
  return useQuery({
    queryKey: ['payouts', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('payouts')
        .select(`
          *,
          tenant:tenants(id, name, bank_details),
          transaction:transactions(id, amount, gateway, gateway_txn_id)
        `)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function usePendingPayouts() {
  return useQuery({
    queryKey: ['pending-payouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_payouts')
        .select('*');

      if (error) throw error;
      return data;
    },
  });
}

export function useProcessPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payoutId: string) => {
      // Call edge function to process payout
      const { data, error } = await supabase.functions.invoke('process-payout', {
        body: { payoutId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['pending-payouts'] });
      toast.success('Payout processed successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to process payout: ${error.message}`);
    },
  });
}
