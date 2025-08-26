
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TenantSubscription, PaymentRecord, Invoice, SubscriptionRenewal } from '@/types/subscription';

interface TenantBillingData {
  active_subscriptions: TenantSubscription[];
  payment_records: PaymentRecord[];
  invoices: Invoice[];
  upcoming_renewals: SubscriptionRenewal[];
  billing_summary: {
    total_revenue: number;
    monthly_revenue: number;
    outstanding_amount: number;
  };
}

export const useTenantBilling = (tenantId?: string) => {
  return useQuery({
    queryKey: ['tenant-billing', tenantId],
    queryFn: async (): Promise<TenantBillingData> => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      // Get active subscriptions with billing plans
      const { data: subscriptions, error: subsError } = await supabase
        .from('tenant_subscriptions')
        .select(`
          *,
          billing_plans (
            id,
            name,
            price_monthly,
            price_annually,
            features,
            limits
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      if (subsError) throw subsError;

      // Get payment records
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_records')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (paymentsError) throw paymentsError;

      // Get invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (invoicesError) throw invoicesError;

      // Get upcoming renewals
      const { data: renewals, error: renewalsError } = await supabase
        .from('subscription_renewals')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('renewal_date', new Date().toISOString().split('T')[0])
        .order('renewal_date', { ascending: true })
        .limit(5);

      if (renewalsError) throw renewalsError;

      // Calculate billing summary
      const completedPayments = payments?.filter(p => p.status === 'completed') || [];
      const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);
      
      const monthlyRevenue = completedPayments
        .filter(p => new Date(p.created_at) >= thisMonthStart)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const outstandingAmount = invoices
        ?.filter(i => i.status === 'sent' || i.status === 'overdue')
        .reduce((sum, i) => sum + (i.amount || 0), 0) || 0;

      return {
        active_subscriptions: subscriptions || [],
        payment_records: payments || [],
        invoices: invoices || [],
        upcoming_renewals: renewals || [],
        billing_summary: {
          total_revenue: totalRevenue,
          monthly_revenue: monthlyRevenue,
          outstanding_amount: outstandingAmount,
        },
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
