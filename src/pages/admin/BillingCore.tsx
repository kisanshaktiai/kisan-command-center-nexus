import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings, DollarSign, CreditCard, Users, TrendingUp } from 'lucide-react';
import { usePlans, usePendingPayouts, useActiveSubscriptions } from '@/hooks/useBillingCore';
import { PlanCard } from '@/components/billing/core/PlanCard';
import { SubscriptionList } from '@/components/billing/core/SubscriptionList';
import { TransactionList } from '@/components/billing/core/TransactionList';
import { PayoutList } from '@/components/billing/core/PayoutList';
import { MetricCardSkeleton } from '@/components/ui/loading-skeleton';
import { currencyService } from '@/services/billing/CurrencyService';

export default function BillingCore() {
  const [activeTab, setActiveTab] = useState('plans');
  
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: activeSubscriptions, isLoading: subsLoading } = useActiveSubscriptions();
  const { data: pendingPayouts, isLoading: payoutsLoading } = usePendingPayouts();

  const totalRevenue = activeSubscriptions?.reduce((sum, sub) => sum + (sub.amount || 0), 0) || 0;
  const totalPayouts = pendingPayouts?.reduce((sum, payout) => sum + payout.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Billing Core</h1>
          <p className="text-muted-foreground">
            Manage plans, subscriptions, transactions, and payouts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Gateway Settings
          </Button>
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        {plansLoading || subsLoading || payoutsLoading ? (
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
                <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {plans?.filter(p => p.is_active).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {plans?.filter(p => p.is_global).length || 0} global plans
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeSubscriptions?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currencyService.formatCurrency(totalRevenue, 'INR')}
                </div>
                <p className="text-xs text-muted-foreground">From active subscriptions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currencyService.formatCurrency(totalPayouts, 'INR')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {pendingPayouts?.length || 0} pending
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>
                Manage global and tenant-specific plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              {plansLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans?.map(plan => (
                    <PlanCard key={plan.id} plan={plan} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Subscriptions</CardTitle>
              <CardDescription>
                View all farmer subscriptions across tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SubscriptionList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Transactions</CardTitle>
              <CardDescription>
                All payment transactions from all gateways
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Payouts</CardTitle>
              <CardDescription>
                Commission settlements for all tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PayoutList showProcessButton={true} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
