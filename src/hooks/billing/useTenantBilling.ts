
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TenantBillingData {
  active_subscriptions: any[];
  payment_records: any[];
  invoices: any[];
  upcoming_renewals: any[];
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

      // For now, return mock data until the new billing tables are properly integrated
      // This allows the UI to render without errors while the database schema is being updated

      const mockBillingSummary = {
        total_revenue: 0,
        monthly_revenue: 0,
        outstanding_amount: 0,
      };

      // Try to get tenant subscriptions if they exist
      const { data: subscriptions } = await supabase
        .from('tenant_subscriptions')
        .select(`
          *,
          billing_plans (
            id,
            name,
            base_price,
            features,
            limits
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .limit(5);

      // Try to get existing payments data if available
      const { data: payments } = await supabase
        .from('payment_records')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Try to get invoices if available
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Try to get renewals if available
      const { data: renewals } = await supabase
        .from('subscription_renewals')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('renewal_date', new Date().toISOString().split('T')[0])
        .order('renewal_date', { ascending: true })
        .limit(5);

      // Calculate billing summary from actual data if available
      if (payments && payments.length > 0) {
        const completedPayments = payments.filter(p => p.status === 'completed');
        const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);
        
        const monthlyRevenue = completedPayments
          .filter(p => new Date(p.created_at) >= thisMonthStart)
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        mockBillingSummary.total_revenue = totalRevenue;
        mockBillingSummary.monthly_revenue = monthlyRevenue;
      }

      if (invoices && invoices.length > 0) {
        const outstandingAmount = invoices
          .filter(i => i.status === 'sent' || i.status === 'overdue')
          .reduce((sum, i) => sum + (i.amount || 0), 0);
        
        mockBillingSummary.outstanding_amount = outstandingAmount;
      }

      return {
        active_subscriptions: subscriptions || [],
        payment_records: payments || [],
        invoices: invoices || [],
        upcoming_renewals: renewals || [],
        billing_summary: mockBillingSummary,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
