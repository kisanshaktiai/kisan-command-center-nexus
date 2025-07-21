
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, CreditCard, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function SubscriptionOverview() {
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['subscriptions-overview'],
    queryFn: async () => {
      // Mock data for subscriptions overview
      const mockSubscriptions = [
        {
          id: '1',
          tenant_name: 'Sample Company',
          plan: 'Shakti',
          status: 'active',
          amount: 2999,
          currency: 'INR',
          next_billing: '2024-02-15',
          created_at: '2024-01-15'
        },
        {
          id: '2',
          tenant_name: 'Another Company',
          plan: 'AI',
          status: 'trial',
          amount: 4999,
          currency: 'INR',
          next_billing: '2024-02-10',
          created_at: '2024-01-10'
        }
      ];
      return mockSubscriptions;
    },
  });

  const activeSubscriptions = subscriptions?.filter(s => s.status === 'active') || [];
  const trialSubscriptions = subscriptions?.filter(s => s.status === 'trial') || [];
  const totalMRR = activeSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);

  if (isLoading) {
    return <div className="text-center py-8">Loading subscriptions...</div>;
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
            <div className="text-2xl font-bold">₹{totalMRR.toLocaleString()}</div>
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
                  <h4 className="font-medium">{subscription.tenant_name}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Plan: {subscription.plan}</span>
                    <span>•</span>
                    <span>₹{subscription.amount?.toLocaleString()}/month</span>
                    <span>•</span>
                    <span>Next billing: {new Date(subscription.next_billing).toLocaleDateString()}</span>
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
