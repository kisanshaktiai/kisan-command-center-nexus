import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, CreditCard, Users, TrendingUp, Calendar, FileText, RefreshCw, Radio } from 'lucide-react';
import { SubscriptionOverview } from '@/components/billing/SubscriptionOverview';
import { PaymentProcessing } from '@/components/billing/PaymentProcessing';
import { InvoiceManagement } from '@/components/billing/InvoiceManagement';
import { SubscriptionRenewals } from '@/components/billing/SubscriptionRenewals';
import { AdvancedAnalytics } from '@/components/billing/AdvancedAnalytics';
import { WalletManagement } from '@/components/billing/WalletManagement';
import { MultiCurrencySettings } from '@/components/billing/MultiCurrencySettings';
import { AutomationRules } from '@/components/billing/AutomationRules';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBillingRealtime } from '@/hooks/useBillingRealtime';
import { MetricCardSkeleton } from '@/components/ui/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function BillingManagement() {
  const [isRealtime, setIsRealtime] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  const { data: billingMetrics, isLoading, error, refetch } = useQuery({
    queryKey: ['tenant-subscriptions-billing'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('tenant-subscriptions-billing', {
          method: 'GET',
        });

        if (error) throw error;

        // Validate response structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response from billing service');
        }

        setLastUpdate(new Date());

        return {
          totalRevenue: data.billing_summary?.total_revenue || 0,
          thisMonthRevenue: data.billing_summary?.monthly_revenue || 0,
          outstandingAmount: data.billing_summary?.outstanding_amount || 0,
          upcomingRenewals: data.upcoming_renewals?.length || 0,
          mrr: data.billing_summary?.monthly_revenue || 0,
          totalSubscriptions: data.active_subscriptions?.length || 0,
          activeSubscriptions: data.active_subscriptions?.length || 0,
          rawData: data
        };
      } catch (error) {
        console.error('Error in billing metrics query:', error);
        toast.error('Failed to fetch billing metrics');
        throw error;
      }
    },
    refetchInterval: isRealtime ? false : 60000,
    staleTime: isRealtime ? Infinity : 30000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Real-time subscription for billing updates
  useBillingRealtime({
    eventType: 'subscription',
    queryKey: ['tenant-subscriptions-billing'],
    showNotifications: false,
    onUpdate: () => {
      if (isRealtime) {
        refetch();
        setLastUpdate(new Date());
      }
    }
  });

  useBillingRealtime({
    eventType: 'payment',
    queryKey: ['tenant-subscriptions-billing'],
    showNotifications: false,
    onUpdate: () => {
      if (isRealtime) {
        refetch();
        setLastUpdate(new Date());
      }
    }
  });

  useBillingRealtime({
    eventType: 'invoice',
    queryKey: ['tenant-subscriptions-billing'],
    showNotifications: false,
    onUpdate: () => {
      if (isRealtime) {
        refetch();
        setLastUpdate(new Date());
      }
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const handleManualRefresh = async () => {
    toast.info('Refreshing billing data...');
    await refetch();
    toast.success('Billing data refreshed');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Billing Management</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">Monitor and manage platform billing, invoices, and payments</p>
            <Badge variant={isRealtime ? "default" : "secondary"} className="flex items-center gap-1">
              <Radio className="h-3 w-3" />
              {isRealtime ? "Live" : "Polling"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsRealtime(!isRealtime);
              toast.info(isRealtime ? 'Switched to manual refresh mode' : 'Switched to real-time mode');
            }}
          >
            {isRealtime ? 'Disable' : 'Enable'} Real-time
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          {error && (
            <Badge variant="destructive">Error loading data</Badge>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {isLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Enhanced Billing Tabs */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="wallet">Wallets</TabsTrigger>
          <TabsTrigger value="currency">Currency</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
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

        <TabsContent value="analytics">
          <AdvancedAnalytics />
        </TabsContent>

        <TabsContent value="wallet">
          <WalletManagement />
        </TabsContent>

        <TabsContent value="currency">
          <MultiCurrencySettings />
        </TabsContent>

        <TabsContent value="automation">
          <AutomationRules />
        </TabsContent>
      </Tabs>
    </div>
  );
}
