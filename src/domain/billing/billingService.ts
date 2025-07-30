
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Use the actual database types
type TenantSubscription = Database['public']['Tables']['tenant_subscriptions']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];

interface Subscription {
  id: string;
  tenant_id: string;
  plan_name: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  amount: number;
  currency: string;
}

class BillingService {
  async getSubscriptions(tenantId?: string): Promise<Subscription[]> {
    try {
      let query = supabase
        .from('tenant_subscriptions')
        .select('*');

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map database records to our Subscription interface
      return (data || []).map((sub: TenantSubscription): Subscription => ({
        id: sub.id,
        tenant_id: sub.tenant_id,
        plan_name: sub.plan_name || 'Unknown',
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        amount: sub.amount || 0,
        currency: sub.currency || 'USD'
      }));
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  }

  async getInvoices(tenantId?: string): Promise<Invoice[]> {
    try {
      let query = supabase
        .from('invoices')
        .select('*');

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  async createSubscription(subscriptionData: Database['public']['Tables']['tenant_subscriptions']['Insert']): Promise<TenantSubscription> {
    try {
      const { data, error } = await supabase
        .from('tenant_subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  async updateSubscription(id: string, updates: Database['public']['Tables']['tenant_subscriptions']['Update']): Promise<TenantSubscription> {
    try {
      const { data, error } = await supabase
        .from('tenant_subscriptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }
}

export const billingService = new BillingService();
