
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
  billing_plan_id?: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  billing_interval: 'monthly' | 'quarterly' | 'annually';
  auto_renew: boolean;
  billing_address: any;
  trial_start?: string;
  trial_end?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  billing_plans?: {
    name: string;
    plan_type: 'kisan_starter' | 'shakti_growth' | 'ai_enterprise';
    base_price: number;
    currency: string;
    billing_interval: string;
  };
  tenants?: {
    name: string;
    subscription_plan: 'kisan_starter' | 'shakti_growth' | 'ai_enterprise';
  };
}

export function SubscriptionOverview() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['tenant-subscriptions'],
    queryFn: async (): Promise<TenantSubscription[]> => {
      try {
        // First, get tenants with their subscription plans
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('id, name, subscription_plan, status, created_at, updated_at, trial_ends_at');
        
        if (tenantError) throw tenantError;
        
        // Transform tenant data to subscription format
        const mockSubscriptions = (tenantData || []).map(tenant => ({
          id: tenant.id,
          tenant_id: tenant.id,
          status: tenant.status || 'trial',
          current_period_start: tenant.created_at,
          current_period_end: tenant.trial_ends_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          billing_interval: 'monthly' as const,
          auto_renew: true,
          billing_address: {},
          created_at: tenant.created_at,
          updated_at: tenant.updated_at || tenant.created_at,
          tenants: {
            name: tenant.name,
            subscription_plan: tenant.subscription_plan as 'kisan_starter' | 'shakti_growth' | 'ai_enterprise'
          },
          billing_plans: {
            name: getPlanDisplayName(tenant.subscription_plan),
            plan_type: tenant.subscription_plan as 'kisan_starter' | 'shakti_growth' | 'ai_enterprise',
            base_price: getPlanPrice(tenant.subscription_plan),
            currency: 'INR',
            billing_interval: 'monthly'
          }
        }));
        
        return mockSubscriptions;
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        return [];
      }
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

  function getPlanDisplayName(plan: string): string {
    switch (plan) {
      case 'kisan_starter': return 'Kisan – Starter';
      case 'shakti_growth': return 'Shakti – Growth';
      case 'ai_enterprise': return 'AI – Enterprise';
      default: return 'Kisan – Starter';
    }
  }

  function getPlanPrice(plan: string): number {
    switch (plan) {
      case 'kisan_starter': return 99;
      case 'shakti_growth': return 199;
      case 'ai_enterprise': return 499;
      default: return 99;
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'trial': return 'bg-blue-500';
      case 'past_due': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      case 'suspended': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPlanTypeColor = (type: string) => {
    switch (type) {
      case 'kisan_starter': return 'bg-blue-500';
      case 'shakti_growth': return 'bg-purple-500';
      case 'ai_enterprise': return 'bg-green-500';
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
            <div className="text-2xl font-bold">₹{(analytics?.mrr || 0).toLocaleString()}</div>
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
          <CardDescription>Manage tenant subscriptions across Kisan – Starter, Shakti – Growth, and AI – Enterprise plans</CardDescription>
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
                <SelectItem value="trial">Trial</SelectItem>
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
              <SelectItem value="kisan_starter">Kisan – Starter</SelectItem>
              <SelectItem value="shakti_growth">Shakti – Growth</SelectItem>
              <SelectItem value="ai_enterprise">AI – Enterprise</SelectItem>
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
                    <Badge className={getPlanTypeColor(subscription.billing_plans?.plan_type || 'kisan_starter')}>
                      {getPlanDisplayName(subscription.billing_plans?.plan_type || 'kisan_starter')}
                      </Badge>
                      <span>•</span>
                      <span>{subscription.billing_plans?.billing_interval}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">
                      ₹{subscription.billing_plans?.base_price?.toLocaleString() || '99'}
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
                  ? "No subscriptions found. Create your first tenant to get started."
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
