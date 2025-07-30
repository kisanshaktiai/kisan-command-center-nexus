
import { supabase } from '@/integrations/supabase/client';

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

interface Invoice {
  id: string;
  tenant_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  due_date: string;
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

      return data || [];
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  }

  async getInvoices(tenantId?: string): Promise<Invoice[]> {
    try {
      let query = supabase
        .from('tenant_billing')
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

  async createSubscription(subscriptionData: Partial<Subscription>): Promise<Subscription> {
    try {
      const { data, error } = await supabase
        .from('tenant_subscriptions')
        .insert([subscriptionData])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription> {
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
