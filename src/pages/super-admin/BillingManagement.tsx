
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
    queryKey: ['billing-metrics'],
    queryFn: async () => {
      try {
        // Get payment records for revenue calculation
        const { data: payments } = await supabase
          .from('payment_records')
          .select('amount, status, created_at');

        // Get invoices for invoice metrics
        const { data: invoices } = await supabase
          .from('invoices')
          .select('amount, status, created_at');

        // Get subscription renewals
        const { data: renewals } = await supabase
          .from('subscription_renewals')
          .select('amount, status, renewal_date');

        // Get active subscriptions
        const { data: subscriptions } = await supabase
          .from('tenant_subscriptions')
          .select('status, current_period_end')
          .eq('status', 'active');

        // Calculate metrics
        const totalRevenue = (payments || [])
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);

        const thisMonthRevenue = (payments || [])
          .filter(p => 
            p.status === 'completed' && 
            new Date(p.created_at) >= thisMonthStart
          )
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        const outstandingAmount = (invoices || [])
          .filter(i => i.status === 'sent' || i.status === 'overdue')
          .reduce((sum, i) => sum + (i.amount || 0), 0);

        const upcomingRenewals = (renewals || [])
          .filter(r => {
            const renewalDate = new Date(r.renewal_date);
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            return renewalDate <= nextWeek && r.status === 'pending';
          }).length;

        const activeSubscriptions = (subscriptions || []).length;

        // Calculate MRR (simplified - would need more complex logic for different billing intervals)
        const mrr = activeSubscriptions * 1000; // Placeholder calculation

        return {
          totalRevenue,
          thisMonthRevenue,
          outstandingAmount,
          upcomingRenewals,
          mrr,
          totalSubscriptions: activeSubscriptions,
          activeSubscriptions
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
