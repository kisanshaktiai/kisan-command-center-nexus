
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, CreditCard, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBillingRealtime } from '@/hooks/useBillingRealtime';
import { useCurrency } from '@/services/billing/CurrencyService';
import { TableRowSkeleton } from '@/components/ui/loading-skeleton';

export function SubscriptionOverview() {
  const { formatCurrency } = useCurrency();
  
  const { data: billingData, isLoading } = useQuery({
    queryKey: ['subscriptions-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('tenant-subscriptions-billing', {
        method: 'GET',
      });

      if (error) {
        console.error('Error fetching subscriptions:', error);
        throw error;
      }

      return data;
    },
    staleTime: 30000,
    retry: 2,
  });

  // Real-time updates
  useBillingRealtime({
    eventType: 'subscription',
    queryKey: ['subscriptions-overview'],
    showNotifications: false
  });

  const subscriptions = billingData?.active_subscriptions || [];
  const activeSubscriptions = subscriptions.filter((s: any) => s.status === 'active');
  const trialSubscriptions = subscriptions.filter((s: any) => s.status === 'trial');
  const totalMRR = activeSubscriptions.reduce((sum: number, sub: any) => sum + (sub.amount || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
        <TableRowSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active customers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMRR)}</div>
            <p className="text-xs text-muted-foreground">Current MRR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trialSubscriptions.length}</div>
            <p className="text-xs text-muted-foreground">Pending conversion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.1%</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
          <CardDescription>Monitor and manage customer subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subscriptions?.map((subscription) => (
              <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{subscription.tenant_name || 'Unknown Tenant'}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Plan: {subscription.plan_name}</span>
                    <span>•</span>
                    <span>{formatCurrency(subscription.amount)}/month</span>
                    <span>•</span>
                    <span>Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                    {subscription.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
              </div>
            ))}

            {(!subscriptions || subscriptions.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No subscriptions found. Subscriptions will appear here once customers sign up.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
