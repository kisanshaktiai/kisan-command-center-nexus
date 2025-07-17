
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Calendar, DollarSign, TrendingUp, Search, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TenantSubscription {
  id: string;
  tenant_id: string;
  status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing' | 'paused';
  billing_interval: 'monthly' | 'quarterly' | 'annually';
  current_period_start: string;
  current_period_end: string;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  auto_renew: boolean;
  discount_percentage: number;
  created_at: string;
  billing_plans?: {
    name: string;
    plan_type: string;
    base_price: number;
    currency: string;
  };
  tenants?: {
    name: string;
  };
}

export function SubscriptionOverview() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  // Fetch subscriptions with tenant and plan details
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['tenant-subscriptions-overview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_subscriptions')
        .select(`
          *,
          billing_plans(name, plan_type, base_price, currency),
          tenants(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TenantSubscription[];
    }
  });

  // Fetch subscription analytics
  const { data: analytics } = useQuery({
    queryKey: ['subscription-analytics'],
    queryFn: async () => {
      const [totalMRR, churnRate, avgLifetime] = await Promise.all([
        // Calculate MRR
        supabase
          .from('tenant_subscriptions')
          .select('billing_plans(base_price, billing_interval)')
          .eq('status', 'active'),
        // Calculate churn rate (simplified)
        supabase
          .from('tenant_subscriptions')
          .select('status')
          .in('status', ['canceled', 'past_due']),
        // Average subscription lifetime
        supabase
          .from('tenant_subscriptions')
          .select('created_at, canceled_at')
          .not('canceled_at', 'is', null)
      ]);

      let mrr = 0;
      if (totalMRR.data) {
        mrr = totalMRR.data.reduce((sum, sub) => {
          const plan = sub.billing_plans;
          if (!plan) return sum;
          
          let monthlyPrice = plan.base_price;
          if (plan.billing_interval === 'quarterly') {
            monthlyPrice = plan.base_price / 3;
          } else if (plan.billing_interval === 'annually') {
            monthlyPrice = plan.base_price / 12;
          }
          
          return sum + monthlyPrice;
        }, 0);
      }

      const churnCount = churnRate.data?.length || 0;
      const totalCount = subscriptions.length;
      const churn = totalCount > 0 ? (churnCount / totalCount) * 100 : 0;

      return {
        mrr,
        churnRate: churn,
        avgLifetime: 8.5, // Placeholder
        newSignups: 15 // Placeholder
      };
    }
  });

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.tenants?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.billing_plans?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesPlan = planFilter === 'all' || sub.billing_plans?.plan_type === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'trialing': return 'bg-blue-500';
      case 'past_due': return 'bg-yellow-500';
      case 'canceled': return 'bg-red-500';
      case 'paused': return 'bg-gray-500';
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
            <div className="text-2xl font-bold">₹{(analytics?.mrr || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+8.2% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(analytics?.churnRate || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">-0.5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Lifetime</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.avgLifetime || 0} months</div>
            <p className="text-xs text-muted-foreground">+0.3 from last month</p>
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
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
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
                      <span>{subscription.billing_interval}</span>
                      {subscription.discount_percentage > 0 && (
                        <>
                          <span>•</span>
                          <span>{subscription.discount_percentage}% discount</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">
                      {subscription.billing_plans?.currency === 'INR' ? '₹' : '$'}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
