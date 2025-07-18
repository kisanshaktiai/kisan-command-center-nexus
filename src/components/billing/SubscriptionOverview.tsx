
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Calendar, DollarSign, TrendingUp, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TenantSubscription {
  id: string;
  tenant_id: string;
  billing_plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_start: string | null;
  trial_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  billing_plans?: {
    name: string;
    plan_type: string;
    base_price: number;
    currency: string;
    billing_interval: string;
  };
  tenants?: {
    name: string;
  };
}

export function SubscriptionOverview() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['tenant-subscriptions'],
    queryFn: async (): Promise<TenantSubscription[]> => {
      const { data, error } = await supabase
        .from('tenant_subscriptions')
        .select(`
          *,
          billing_plans(name, plan_type, base_price, currency, billing_interval),
          tenants(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch subscriptions:', error);
        return [];
      }

      return data || [];
    },
    refetchInterval: 30000, // Real-time updates every 30 seconds
  });

  const { data: analytics } = useQuery({
    queryKey: ['subscription-analytics'],
    queryFn: async () => {
      if (!subscriptions) return null;

      const mrr = subscriptions
        .filter(sub => sub.status === 'active')
        .reduce((sum, sub) => sum + (sub.billing_plans?.base_price || 0), 0);

      const activeCount = subscriptions.filter(sub => sub.status === 'active').length;
      const cancelledCount = subscriptions.filter(sub => sub.status === 'cancelled').length;
      
      const churnRate = subscriptions.length > 0 ? 
        (cancelledCount / subscriptions.length) * 100 : 0;

      // Calculate average lifetime (simplified)
      const avgLifetime = subscriptions.length > 0 ? 
        subscriptions.reduce((sum, sub) => {
          const start = new Date(sub.created_at);
          const end = sub.cancelled_at ? new Date(sub.cancelled_at) : new Date();
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
        }, 0) / subscriptions.length : 0;

      const thisMonthSignups = subscriptions.filter(sub => {
        const created = new Date(sub.created_at);
        const thisMonth = new Date();
        return created.getMonth() === thisMonth.getMonth() && 
               created.getFullYear() === thisMonth.getFullYear();
      }).length;

      return {
        mrr,
        churnRate,
        avgLifetime,
        newSignups: thisMonthSignups
      };
    },
    enabled: !!subscriptions,
  });

  // Filter subscriptions
  const filteredSubscriptions = subscriptions?.filter(sub => {
    const matchesSearch = sub.tenants?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.billing_plans?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesPlan = planFilter === 'all' || sub.billing_plans?.plan_type === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'past_due': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      case 'suspended': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPlanTypeColor = (type: string) => {
    switch (type) {
      case 'starter': return 'bg-blue-500';
      case 'growth': return 'bg-purple-500';
      case 'enterprise': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading subscriptions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(analytics?.mrr || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From active subscriptions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(analytics?.churnRate || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Subscription cancellations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Lifetime</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(analytics?.avgLifetime || 0).toFixed(1)} months</div>
            <p className="text-xs text-muted-foreground">Customer retention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Signups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.newSignups || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
          <CardDescription>Manage tenant subscriptions and billing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenants or plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredSubscriptions.map((subscription) => (
              <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div>
                    <h4 className="font-medium">{subscription.tenants?.name || 'Unknown Tenant'}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge className={getPlanTypeColor(subscription.billing_plans?.plan_type || '')}>
                        {subscription.billing_plans?.name || 'Unknown Plan'}
                      </Badge>
                      <span>•</span>
                      <span>{subscription.billing_plans?.billing_interval}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">
                      {subscription.billing_plans?.currency === 'USD' ? '$' : '₹'}
                      {subscription.billing_plans?.base_price?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <Badge className={getStatusColor(subscription.status)}>
                    {subscription.status}
                  </Badge>
                  
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
              </div>
            ))}

            {filteredSubscriptions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {subscriptions?.length === 0 
                  ? "No subscriptions found. Create your first subscription plan to get started."
                  : "No subscriptions match your current filters."
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
