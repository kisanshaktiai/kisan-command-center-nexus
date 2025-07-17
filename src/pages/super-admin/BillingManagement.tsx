
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, DollarSign, FileText, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { BillingPlansManager } from '@/components/billing/BillingPlansManager';
import { SubscriptionOverview } from '@/components/billing/SubscriptionOverview';
import { PaymentProcessing } from '@/components/billing/PaymentProcessing';
import { InvoiceManagement } from '@/components/billing/InvoiceManagement';
import { UsageTracking } from '@/components/billing/UsageTracking';
import { FinancialReporting } from '@/components/billing/FinancialReporting';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function BillingManagement() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch billing overview metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['billing-metrics'],
    queryFn: async () => {
      const [subscriptions, invoices, payments, revenue] = await Promise.all([
        supabase.from('tenant_subscriptions').select('status').eq('status', 'active'),
        supabase.from('invoices').select('status, total_amount').eq('status', 'pending'),
        supabase.from('payments').select('amount').eq('status', 'failed'),
        supabase.from('payments').select('amount').eq('status', 'completed')
      ]);

      const totalRevenue = revenue.data?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      const pendingAmount = invoices.data?.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0) || 0;

      return {
        activeSubscriptions: subscriptions.data?.length || 0,
        pendingInvoices: invoices.data?.length || 0,
        failedPayments: payments.data?.length || 0,
        totalRevenue,
        pendingAmount
      };
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing & Payment Management</h1>
          <p className="text-muted-foreground">Comprehensive billing system for multi-tenant SaaS platform</p>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(metrics?.totalRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.pendingInvoices || 0}</div>
            <p className="text-xs text-muted-foreground">₹{(metrics?.pendingAmount || 0).toLocaleString()} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.failedPayments || 0}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15.3%</div>
            <p className="text-xs text-muted-foreground">MRR growth</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <SubscriptionOverview />
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <BillingPlansManager />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentProcessing />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <InvoiceManagement />
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <UsageTracking />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <FinancialReporting />
        </TabsContent>
      </Tabs>
    </div>
  );
}
