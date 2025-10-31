import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BillingAnalytics {
  revenue: {
    total: number;
    monthly: number;
    daily: number;
    trend: { date: string; amount: number }[];
  };
  subscriptions: {
    total: number;
    active: number;
    cancelled: number;
    expired: number;
    churn_rate: number;
    mrr: number;
    arr: number;
  };
  transactions: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    success_rate: number;
    average_value: number;
  };
  payouts: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    total_amount: number;
  };
  farmers: {
    total: number;
    subscribed: number;
    conversion_rate: number;
  };
}

export const useBillingAnalytics = (dateRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['billing-analytics', dateRange],
    queryFn: async () => {
      console.log('Fetching billing analytics...');

      // Fetch revenue data
      let revenueQuery = supabase
        .from('transactions')
        .select('amount, currency, created_at, status');

      if (dateRange) {
        revenueQuery = revenueQuery
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      const { data: transactions, error: revenueError } = await revenueQuery;
      if (revenueError) throw revenueError;

      // Fetch subscriptions data
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('id, status, created_at, updated_at');
      if (subsError) throw subsError;

      // Fetch payouts data
      const { data: payouts, error: payoutsError } = await supabase
        .from('payouts')
        .select('id, amount, status, created_at');
      if (payoutsError) throw payoutsError;

      // Fetch farmers count
      const { count: totalFarmers, error: farmersError } = await supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true });
      if (farmersError) throw farmersError;

      // Calculate metrics
      const completedTransactions = transactions?.filter(t => t.status === 'completed') || [];
      const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      // Calculate MRR (Monthly Recurring Revenue)
      const activeSubscriptions = subscriptions?.filter(s => s.status === 'active') || [];
      const mrr = activeSubscriptions.reduce((sum, sub) => {
        // Simplified MRR calculation - would need plan data for accurate calculation
        return sum + 100; // Placeholder
      }, 0);

      // Calculate trend data (last 30 days)
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
      });

      const revenueTrend = last30Days.map(date => {
        const dayTransactions = completedTransactions.filter(t => 
          t.created_at.startsWith(date)
        );
        return {
          date,
          amount: dayTransactions.reduce((sum, t) => sum + t.amount, 0)
        };
      });

      // Calculate churn rate
      const cancelledLastMonth = subscriptions?.filter(s => {
        if (s.status !== 'cancelled') return false;
        const updateDate = new Date(s.updated_at);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return updateDate >= monthAgo;
      }).length || 0;

      const churnRate = activeSubscriptions.length > 0
        ? (cancelledLastMonth / activeSubscriptions.length) * 100
        : 0;

      // Calculate success rate
      const successRate = transactions && transactions.length > 0
        ? (completedTransactions.length / transactions.length) * 100
        : 0;

      // Calculate average transaction value
      const avgTransactionValue = completedTransactions.length > 0
        ? totalRevenue / completedTransactions.length
        : 0;

      // Calculate farmer conversion rate
      const subscribedFarmers = new Set(subscriptions?.map(s => s.id)).size;
      const conversionRate = totalFarmers && totalFarmers > 0
        ? (subscribedFarmers / totalFarmers) * 100
        : 0;

      const analytics: BillingAnalytics = {
        revenue: {
          total: totalRevenue,
          monthly: revenueTrend.slice(-30).reduce((sum, d) => sum + d.amount, 0),
          daily: revenueTrend[revenueTrend.length - 1]?.amount || 0,
          trend: revenueTrend
        },
        subscriptions: {
          total: subscriptions?.length || 0,
          active: activeSubscriptions.length,
          cancelled: subscriptions?.filter(s => s.status === 'cancelled').length || 0,
          expired: subscriptions?.filter(s => s.status === 'expired').length || 0,
          churn_rate: churnRate,
          mrr,
          arr: mrr * 12
        },
        transactions: {
          total: transactions?.length || 0,
          completed: completedTransactions.length,
          failed: transactions?.filter(t => t.status === 'failed').length || 0,
          pending: transactions?.filter(t => t.status === 'pending').length || 0,
          success_rate: successRate,
          average_value: avgTransactionValue
        },
        payouts: {
          total: payouts?.length || 0,
          pending: payouts?.filter(p => p.status === 'pending').length || 0,
          completed: payouts?.filter(p => p.status === 'completed').length || 0,
          failed: payouts?.filter(p => p.status === 'failed').length || 0,
          total_amount: payouts?.reduce((sum, p) => sum + p.amount, 0) || 0
        },
        farmers: {
          total: totalFarmers || 0,
          subscribed: subscribedFarmers,
          conversion_rate: conversionRate
        }
      };

      console.log('Billing analytics:', analytics);
      return analytics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000 // Auto-refetch every 5 minutes
  });
};
