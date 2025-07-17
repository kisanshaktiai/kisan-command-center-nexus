
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Activity, Database, Wifi, Users, Zap, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UsageRecord {
  id: string;
  tenant_id: string;
  metric_type: 'api_calls' | 'storage_gb' | 'bandwidth_gb' | 'users' | 'transactions' | 'custom';
  quantity: number;
  recorded_at: string;
  billing_period_start: string;
  billing_period_end: string;
  tenants?: {
    name: string;
  };
  tenant_subscriptions?: {
    billing_plans?: {
      name: string;
      usage_limits: Record<string, any>;
    };
  };
}

export function UsageTracking() {
  const [selectedTenant, setSelectedTenant] = useState<string>('all');
  const [metricFilter, setMetricFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('current_month');

  // Fetch usage records
  const { data: usageRecords = [], isLoading } = useQuery({
    queryKey: ['usage-records', selectedTenant, metricFilter, periodFilter],
    queryFn: async () => {
      let query = supabase
        .from('usage_records')
        .select(`
          *,
          tenants(name),
          tenant_subscriptions(
            billing_plans(name, usage_limits)
          )
        `)
        .order('recorded_at', { ascending: false });

      if (selectedTenant !== 'all') {
        query = query.eq('tenant_id', selectedTenant);
      }

      if (metricFilter !== 'all') {
        query = query.eq('metric_type', metricFilter);
      }

      // Filter by period
      const now = new Date();
      if (periodFilter === 'current_month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        query = query.gte('recorded_at', startOfMonth.toISOString());
      }

      const { data, error } = await query.limit(1000);
      
      if (error) throw error;
      return data as UsageRecord[];
    }
  });

  // Fetch tenants for filter
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants-for-usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Aggregate usage data by tenant and metric
  const aggregatedUsage = usageRecords.reduce((acc, record) => {
    const key = `${record.tenant_id}-${record.metric_type}`;
    if (!acc[key]) {
      acc[key] = {
        tenant_id: record.tenant_id,
        tenant_name: record.tenants?.name || 'Unknown',
        metric_type: record.metric_type,
        total_quantity: 0,
        plan_name: record.tenant_subscriptions?.billing_plans?.name || 'No Plan',
        usage_limit: record.tenant_subscriptions?.billing_plans?.usage_limits?.[`max_${record.metric_type.replace('_calls', '').replace('_gb', '')}`] || 0,
        records: []
      };
    }
    acc[key].total_quantity += record.quantity;
    acc[key].records.push(record);
    return acc;
  }, {} as Record<string, any>);

  // Prepare chart data
  const chartData = Object.values(aggregatedUsage).map((usage: any) => ({
    tenant: usage.tenant_name,
    metric: usage.metric_type,
    usage: usage.total_quantity,
    limit: usage.usage_limit === -1 ? 'Unlimited' : usage.usage_limit,
    utilization: usage.usage_limit === -1 ? 0 : (usage.total_quantity / usage.usage_limit) * 100
  }));

  // Usage trend data for chart
  const trendData = usageRecords
    .filter(record => record.metric_type === 'api_calls')
    .slice(-30)
    .map(record => ({
      date: new Date(record.recorded_at).toLocaleDateString(),
      usage: record.quantity
    }));

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'api_calls': return <Zap className="w-4 h-4" />;
      case 'storage_gb': return <Database className="w-4 h-4" />;
      case 'bandwidth_gb': return <Wifi className="w-4 h-4" />;
      case 'users': return <Users className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-500';
    if (utilization >= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatMetricName = (metric: string) => {
    return metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatQuantity = (quantity: number, metric: string) => {
    if (metric.includes('gb')) {
      return `${quantity.toFixed(2)} GB`;
    }
    return quantity.toLocaleString();
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading usage data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Usage Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageRecords.filter(r => r.metric_type === 'api_calls').reduce((sum, r) => sum + r.quantity, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageRecords.filter(r => r.metric_type === 'storage_gb').reduce((sum, r) => sum + r.quantity, 0).toFixed(1)} GB
            </div>
            <p className="text-xs text-muted-foreground">Across all tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bandwidth Used</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageRecords.filter(r => r.metric_type === 'bandwidth_gb').reduce((sum, r) => sum + r.quantity, 0).toFixed(1)} GB
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over Limit Tenants</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(aggregatedUsage).filter((usage: any) => 
                usage.usage_limit !== -1 && usage.total_quantity > usage.usage_limit
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Analytics</CardTitle>
          <CardDescription>Monitor resource consumption and usage patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={metricFilter} onValueChange={setMetricFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Metrics</SelectItem>
                <SelectItem value="api_calls">API Calls</SelectItem>
                <SelectItem value="storage_gb">Storage</SelectItem>
                <SelectItem value="bandwidth_gb">Bandwidth</SelectItem>
                <SelectItem value="users">Users</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Current Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="current_quarter">Current Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Usage Trends Chart */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">API Usage Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="usage" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Usage by Tenant */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Usage by Tenant</h3>
            {Object.values(aggregatedUsage).map((usage: any) => (
              <div key={`${usage.tenant_id}-${usage.metric_type}`} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  {getMetricIcon(usage.metric_type)}
                  <div>
                    <h4 className="font-medium">{usage.tenant_name}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatMetricName(usage.metric_type)}</span>
                      <span>•</span>
                      <span>{usage.plan_name}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">
                      {formatQuantity(usage.total_quantity, usage.metric_type)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      of {usage.usage_limit === -1 ? 'Unlimited' : formatQuantity(usage.usage_limit, usage.metric_type)}
                    </div>
                  </div>
                  
                  {usage.usage_limit !== -1 && (
                    <div className="w-32">
                      <div className="flex justify-between text-sm mb-1">
                        <span className={getUtilizationColor(usage.utilization)}>
                          {usage.utilization.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={Math.min(usage.utilization, 100)} className="h-2" />
                    </div>
                  )}
                  
                  {usage.total_quantity > usage.usage_limit && usage.usage_limit !== -1 && (
                    <Badge variant="destructive">Over Limit</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
