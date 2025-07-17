
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, CreditCard, Users, TrendingUp } from 'lucide-react';
import { SubscriptionOverview } from '@/components/billing/SubscriptionOverview';
import { PaymentProcessing } from '@/components/billing/PaymentProcessing';
import { UsageTracking } from '@/components/billing/UsageTracking';

export default function BillingManagement() {
  // Mock data until Supabase types are regenerated
  const overviewData = {
    totalRevenue: 15420.50,
    thisMonthRevenue: 3240.75,
    outstandingAmount: 1250.00,
    mrr: 2890.99,
    totalSubscriptions: 45,
    activeSubscriptions: 42
  };

  const isLoading = false;

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
