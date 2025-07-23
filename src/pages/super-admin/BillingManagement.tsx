import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, CreditCard, Users, TrendingUp, Calendar, FileText } from 'lucide-react';
import { SubscriptionOverview } from '@/components/billing/SubscriptionOverview';
import { PaymentProcessing } from '@/components/billing/PaymentProcessing';
import { InvoiceManagement } from '@/components/billing/InvoiceManagement';
import { SubscriptionRenewals } from '@/components/billing/SubscriptionRenewals';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function BillingManagement() {
  const { data: billingMetrics, isLoading } = useQuery({
    queryKey: ['tenant-subscriptions-billing'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('tenant-subscriptions-billing', {
          method: 'GET',
        });

        if (error) throw error;

        // Transform the response to match the expected format
        return {
          totalRevenue: data.billing_summary?.total_revenue || 0,
          thisMonthRevenue: data.billing_summary?.monthly_revenue || 0,
          outstandingAmount: data.billing_summary?.outstanding_amount || 0,
          upcomingRenewals: data.upcoming_renewals?.length || 0,
          mrr: data.billing_summary?.monthly_revenue || 0,
          totalSubscriptions: data.active_subscriptions?.length || 0,
          activeSubscriptions: data.active_subscriptions?.length || 0
        };
      } catch (error) {
        console.error('Error in billing metrics query:', error);
        return {
          totalRevenue: 0,
          thisMonthRevenue: 0,
          outstandingAmount: 0,
          upcomingRenewals: 0,
          mrr: 0,
          totalSubscriptions: 0,
          activeSubscriptions: 0
        };
      }
    },
    refetchInterval: 30000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading billing data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing Management</h1>
        <p className="text-muted-foreground">Monitor and manage platform billing, invoices, and payments</p>
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
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(billingMetrics?.outstandingAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">Pending invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Renewals</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billingMetrics?.upcomingRenewals || 0}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Tabs */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <SubscriptionOverview />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoiceManagement />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentProcessing />
        </TabsContent>

        <TabsContent value="renewals">
          <SubscriptionRenewals />
        </TabsContent>
      </Tabs>
    </div>
  );
}
