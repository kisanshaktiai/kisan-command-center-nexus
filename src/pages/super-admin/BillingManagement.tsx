
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, CreditCard, Users, TrendingUp } from 'lucide-react';
import { SubscriptionOverview } from '@/components/billing/SubscriptionOverview';
import { PaymentProcessing } from '@/components/billing/PaymentProcessing';
import { UsageTracking } from '@/components/billing/UsageTracking';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function BillingManagement() {
  const { data: billingMetrics, isLoading } = useQuery({
    queryKey: ['billing-metrics'],
    queryFn: async () => {
      const { data: subscriptions, error: subError } = await supabase
        .from('tenant_subscriptions')
        .select(`
          *,
          billing_plans(name, base_price, currency),
          tenants(name)
        `)
        .eq('status', 'active');

      if (subError) throw subError;

      const { data: payments, error: payError } = await supabase
        .from('payments')
        .select('*')
        .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString());

      if (payError) throw payError;

      const totalRevenue = payments?.reduce((sum, payment) => 
        payment.status === 'completed' ? sum + payment.amount : sum, 0) || 0;
      
      const thisMonthRevenue = payments?.filter(p => 
        new Date(p.created_at) >= new Date(new Date().setMonth(new Date().getMonth() - 1))
      ).reduce((sum, payment) => 
        payment.status === 'completed' ? sum + payment.amount : sum, 0) || 0;

      const outstandingAmount = payments?.filter(p => 
        p.status === 'pending' || p.status === 'failed'
      ).reduce((sum, payment) => sum + payment.amount, 0) || 0;

      const mrr = subscriptions?.reduce((sum, sub) => 
        sum + (sub.billing_plans?.base_price || 0), 0) || 0;

      return {
        totalRevenue,
        thisMonthRevenue,
        outstandingAmount,
        mrr,
        totalSubscriptions: subscriptions?.length || 0,
        activeSubscriptions: subscriptions?.filter(s => s.status === 'active').length || 0
      };
    },
    refetchInterval: 30000, // Real-time updates every 30 seconds
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading billing data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing Management</h1>
        <p className="text-muted-foreground">Monitor and manage platform billing and subscriptions</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(billingMetrics?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">All time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(billingMetrics?.thisMonthRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">Revenue this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(billingMetrics?.outstandingAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">Pending invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billingMetrics?.activeSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">MRR: {formatCurrency(billingMetrics?.mrr || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Tabs */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="usage">Usage Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <SubscriptionOverview />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentProcessing />
        </TabsContent>

        <TabsContent value="usage">
          <UsageTracking />
        </TabsContent>
      </Tabs>
    </div>
  );
}
