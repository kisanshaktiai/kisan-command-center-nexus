import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, CreditCard, Users, TrendingUp, Calendar, FileText, RefreshCw, Radio, Package, Wallet, Webhook, BarChart3 } from 'lucide-react';
import { PlanCard } from '@/components/billing/core/PlanCard';
import { SubscriptionList } from '@/components/billing/core/SubscriptionList';
import { TransactionList } from '@/components/billing/core/TransactionList';
import { PayoutList } from '@/components/billing/core/PayoutList';
import { AdvancedAnalyticsDashboard } from '@/components/billing/AdvancedAnalyticsDashboard';
import { WebhookManager } from '@/components/billing/WebhookManager';
import { usePlans, useSubscriptions, useTransactions, usePayouts } from '@/hooks/useBillingCore';
import { useBillingAnalytics } from '@/hooks/useBillingAnalytics';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MetricCardSkeleton } from '@/components/ui/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function BillingManagement() {
  const [isRealtime, setIsRealtime] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  // Fetch billing data using new hooks
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: subscriptions, isLoading: subscriptionsLoading } = useSubscriptions();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions();
  const { data: payouts, isLoading: payoutsLoading } = usePayouts();
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useBillingAnalytics();

  const isLoading = plansLoading || subscriptionsLoading || transactionsLoading || payoutsLoading || analyticsLoading;

  // Setup real-time listeners for all billing tables
  useEffect(() => {
    if (!isRealtime) return;

    const channel = supabase
      .channel('billing-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'plans'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['plans'] });
        setLastUpdate(new Date());
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscriptions'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
        queryClient.invalidateQueries({ queryKey: ['billing-analytics'] });
        setLastUpdate(new Date());
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['billing-analytics'] });
        setLastUpdate(new Date());
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payouts'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['payouts'] });
        queryClient.invalidateQueries({ queryKey: ['billing-analytics'] });
        setLastUpdate(new Date());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isRealtime, queryClient]);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleManualRefresh = async () => {
    toast.info('Refreshing billing data...');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['plans'] }),
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['payouts'] }),
      refetchAnalytics()
    ]);
    setLastUpdate(new Date());
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
                <div className="text-2xl font-bold">{formatCurrency(analytics?.revenue.total || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(analytics?.revenue.monthly || 0)} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.subscriptions.active || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.subscriptions.total || 0} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.transactions.success_rate.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.transactions.completed || 0} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">MRR / ARR</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics?.subscriptions.mrr || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(analytics?.subscriptions.arr || 0)} annually
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Enhanced Billing Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="plans">
            <Package className="h-4 w-4 mr-2" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <Users className="h-4 w-4 mr-2" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <CreditCard className="h-4 w-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="payouts">
            <Wallet className="h-4 w-4 mr-2" />
            Payouts
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>Overview of billing system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Plans:</span>
                  <span className="font-medium">{plans?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Subscriptions:</span>
                  <span className="font-medium">{subscriptions?.filter(s => s.status === 'active').length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending Payouts:</span>
                  <span className="font-medium">{payouts?.filter(p => p.status === 'pending').length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed Transactions:</span>
                  <span className="font-medium">{transactions?.filter(t => t.status === 'completed').length || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest billing events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {transactions?.slice(0, 5).map((txn) => (
                    <div key={txn.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{formatCurrency(txn.amount, txn.currency)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={txn.status === 'completed' ? 'default' : 'secondary'}>
                        {txn.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>Manage all subscription plans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plans?.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>All Subscriptions</CardTitle>
              <CardDescription>Monitor farmer subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <SubscriptionList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Payouts</CardTitle>
              <CardDescription>Manage commission payouts</CardDescription>
            </CardHeader>
            <CardContent>
              <PayoutList showProcessButton={true} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhookManager />
        </TabsContent>

        <TabsContent value="analytics">
          <AdvancedAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
