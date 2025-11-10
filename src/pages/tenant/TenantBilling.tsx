import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Users, Clock } from 'lucide-react';
import { useSubscriptions, useTransactions, usePayouts } from '@/hooks/useBillingCore';
import { SubscriptionList } from '@/components/billing/core/SubscriptionList';
import { TransactionList } from '@/components/billing/core/TransactionList';
import { PayoutList } from '@/components/billing/core/PayoutList';
import { MetricCardSkeleton } from '@/components/ui/loading-skeleton';
import { currencyService } from '@/services/billing/CurrencyService';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function TenantBilling() {
  // Get current tenant from user profile
  const { data: profile } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const tenantId = profile?.tenant_id;

  const { data: subscriptions, isLoading: subsLoading } = useSubscriptions({ tenantId });
  const { data: transactions, isLoading: transLoading } = useTransactions({ tenantId });
  const { data: payouts, isLoading: payoutsLoading } = usePayouts(tenantId);

  const totalRevenue = transactions?.reduce((sum, t: any) => 
    t.status === 'success' ? sum + t.amount : sum, 0) || 0;
  
  const pendingPayouts = payouts?.filter((p: any) => p.status === 'pending') || [];
  const completedPayouts = payouts?.filter((p: any) => p.status === 'completed') || [];
  
  const totalPending = pendingPayouts.reduce((sum: number, p: any) => sum + p.amount, 0);
  const totalPaid = completedPayouts.reduce((sum: number, p: any) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Revenue</h1>
        <p className="text-muted-foreground">
          Track your revenue, subscriptions, and payouts
        </p>
      </div>

      {/* Revenue Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        {subsLoading || transLoading || payoutsLoading ? (
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
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currencyService.formatCurrency(totalRevenue, 'INR')}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {transactions?.length || 0} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {subscriptions?.filter((s: any) => s.status === 'active').length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total: {subscriptions?.length || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currencyService.formatCurrency(totalPending, 'INR')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {pendingPayouts.length} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currencyService.formatCurrency(totalPaid, 'INR')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {completedPayouts.length} completed
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Farmer Subscriptions</CardTitle>
              <CardDescription>
                View all subscriptions purchased by your farmers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SubscriptionList tenantId={tenantId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Payment Transactions</CardTitle>
              <CardDescription>
                All payment transactions for your tenant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionList tenantId={tenantId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Your Payouts</CardTitle>
              <CardDescription>
                Commission settlements and payout history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PayoutList tenantId={tenantId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
