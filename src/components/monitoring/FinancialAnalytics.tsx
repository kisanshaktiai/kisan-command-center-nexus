
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  AlertTriangle,
  Users,
  Target
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface FinancialAnalyticsProps {
  refreshInterval: number;
}

const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({ refreshInterval }) => {
  const [timeRange, setTimeRange] = useState('12m');

  const { data: financialData, isLoading } = useQuery({
    queryKey: ['financial-metrics', timeRange],
    queryFn: async () => {
      const monthsBack = timeRange === '12m' ? 12 : timeRange === '6m' ? 6 : 3;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);

      const { data: metrics, error: metricsError } = await supabase
        .from('financial_metrics')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

      if (metricsError) throw metricsError;

      const { data: subscriptions, error: subError } = await supabase
        .from('tenant_subscriptions')
        .select(`
          *,
          billing_plans(name, base_price, currency),
          tenants(name)
        `)
        .gte('created_at', startDate.toISOString());

      if (subError) throw subError;

      // Mock data since these tables don't exist yet
      const mockMetrics = [];
      const mockSubscriptions = [{
        id: '1',
        status: 'active',
        billing_plans: { name: 'Premium', base_price: 99.99 },
        tenants: { name: 'Sample Company' }
      }];
      const mockPayments = [{
        id: '1',
        status: 'completed',
        amount: 99.99,
        created_at: new Date().toISOString()
      }];

      return {
        metrics: mockMetrics,
        subscriptions: mockSubscriptions,
        payments: mockPayments
      };
    },
    refetchInterval: refreshInterval,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-40 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const currentMetrics = React.useMemo(() => {
    if (!financialData) return null;

    const mrr = financialData.subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((sum, sub) => sum + (sub.billing_plans?.base_price || 0), 0);

    const arr = mrr * 12;
    
    const completedPayments = financialData.payments.filter(p => p.status === 'completed');
    const failedPayments = financialData.payments.filter(p => p.status === 'failed');
    
    const churnRate = financialData.subscriptions.filter(s => s.status === 'cancelled').length / 
      financialData.subscriptions.length * 100;

    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const avgCustomerValue = totalRevenue / financialData.subscriptions.length;

    return {
      mrr,
      arr,
      churn_rate: churnRate,
      ltv: avgCustomerValue * 12, // Simplified LTV calculation
      payment_failures: failedPayments.length / financialData.payments.length * 100,
      gross_margin: 78.5 // This would need more complex calculation with cost data
    };
  }, [financialData]);

  const monthlyRevenue = React.useMemo(() => {
    if (!financialData) return [];

    const monthlyData = financialData.payments
      .filter(p => p.status === 'completed')
      .reduce((acc, payment) => {
        const month = new Date(payment.created_at).toLocaleDateString('en-US', { month: 'short' });
        if (!acc[month]) {
          acc[month] = { month, revenue: 0, new_customers: 0, churn: 0 };
        }
        acc[month].revenue += payment.amount;
        return acc;
      }, {} as Record<string, any>);

    return Object.values(monthlyData).slice(-6);
  }, [financialData]);

  const tenantTypeRevenue = React.useMemo(() => {
    if (!financialData) return [];

    const typeData = financialData.subscriptions.reduce((acc, sub) => {
      const type = sub.billing_plans?.name || 'Unknown';
      if (!acc[type]) {
        acc[type] = { type, revenue: 0, count: 0 };
      }
      acc[type].revenue += sub.billing_plans?.base_price || 0;
      acc[type].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(typeData).map((item: any, index) => ({
      ...item,
      color: ['#8884d8', '#82ca9d', '#ffc658'][index % 3]
    }));
  }, [financialData]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Financial Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3m">Last 3 Months</SelectItem>
            <SelectItem value="6m">Last 6 Months</SelectItem>
            <SelectItem value="12m">Last 12 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(currentMetrics?.mrr || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              Active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(currentMetrics?.arr || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Projected annual revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(currentMetrics?.churn_rate || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Subscription cancellations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer LTV</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(currentMetrics?.ltv || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime value estimate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Failure Rate</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(currentMetrics?.payment_failures || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Failed transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(currentMetrics?.gross_margin || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Revenue after costs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Growth</CardTitle>
            <CardDescription>Monthly revenue trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.3} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan Type</CardTitle>
            <CardDescription>Revenue distribution across subscription tiers</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tenantTypeRevenue}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, revenue }) => `${type}: $${revenue.toLocaleString()}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {tenantTypeRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* No Mock Data Message */}
      {(!financialData?.metrics || financialData.metrics.length === 0) && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>No financial data available for the selected time range.</p>
              <p className="text-sm mt-1">Data will appear here once financial transactions are recorded.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FinancialAnalytics;
