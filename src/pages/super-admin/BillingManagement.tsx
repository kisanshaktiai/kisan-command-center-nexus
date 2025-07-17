
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, CreditCard, Users, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionOverview } from '@/components/billing/SubscriptionOverview';
import { PaymentProcessing } from '@/components/billing/PaymentProcessing';
import { UsageTracking } from '@/components/billing/UsageTracking';

export default function BillingManagement() {
  // Fetch billing overview data
  const { data: overviewData, isLoading } = useQuery({
    queryKey: ['billing-overview'],
    queryFn: async () => {
      // Get all data in parallel
      const [invoicesRes, paymentsRes, subscriptionsRes] = await Promise.all([
        supabase.from('invoices').select('amount, status, created_at'),
        supabase.from('payments').select('amount, status, created_at'),
        supabase.from('tenant_subscriptions').select('*, billing_plans(base_price, billing_interval)')
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (subscriptionsRes.error) throw subscriptionsRes.error;

      const invoices = invoicesRes.data || [];
      const payments = paymentsRes.data || [];
      const subscriptions = subscriptionsRes.data || [];

      // Calculate metrics
      const totalRevenue = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const thisMonthRevenue = payments
        .filter(p => {
          const paymentDate = new Date(p.created_at);
          const now = new Date();
          return p.status === 'completed' && 
                 paymentDate.getMonth() === now.getMonth() &&
                 paymentDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const outstandingAmount = invoices
        .filter(i => i.status === 'sent' || i.status === 'overdue')
        .reduce((sum, i) => sum + i.amount, 0);

      // Calculate MRR
      const mrr = subscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, sub) => {
          if (!sub.billing_plans) return sum;
          let monthlyPrice = sub.billing_plans.base_price;
          if (sub.billing_plans.billing_interval === 'quarterly') {
            monthlyPrice = sub.billing_plans.base_price / 3;
          } else if (sub.billing_plans.billing_interval === 'annually') {
            monthlyPrice = sub.billing_plans.base_price / 12;
          }
          return sum + monthlyPrice;
        }, 0);

      return {
        totalRevenue,
        thisMonthRevenue,
        outstandingAmount,
        mrr,
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: subscriptions.filter(s => s.status === 'active').length
      };
    }
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
            <div className="text-2xl font-bold">{formatCurrency(overviewData?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">All time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overviewData?.thisMonthRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">Revenue this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overviewData?.outstandingAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">Pending invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData?.activeSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">MRR: {formatCurrency(overviewData?.mrr || 0)}</p>
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
