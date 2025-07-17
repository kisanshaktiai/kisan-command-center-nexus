
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
  Calendar,
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

      const { data, error } = await supabase
        .from('financial_metrics')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: refreshInterval,
  });

  // Mock financial data for demonstration
  const currentMetrics = {
    mrr: 45231,
    arr: 542772,
    churn_rate: 2.3,
    ltv: 4850,
    payment_failures: 0.8,
    gross_margin: 78.5
  };

  const monthlyRevenue = [
    { month: 'Jan', revenue: 38500, new_customers: 45, churn: 12 },
    { month: 'Feb', revenue: 41200, new_customers: 52, churn: 8 },
    { month: 'Mar', revenue: 39800, new_customers: 38, churn: 15 },
    { month: 'Apr', revenue: 43500, new_customers: 67, churn: 10 },
    { month: 'May', revenue: 46200, new_customers: 58, churn: 14 },
    { month: 'Jun', revenue: 45231, new_customers: 62, churn: 11 },
  ];

  const tenantTypeRevenue = [
    { type: 'Enterprise', revenue: 25400, count: 15, color: '#8884d8' },
    { type: 'Professional', revenue: 12800, count: 35, color: '#82ca9d' },
    { type: 'Starter', revenue: 7031, count: 87, color: '#ffc658' },
  ];

  const churnAnalysis = [
    { reason: 'Price', percentage: 35, count: 28 },
    { reason: 'Features', percentage: 22, count: 18 },
    { reason: 'Support', percentage: 18, count: 14 },
    { reason: 'Usability', percentage: 15, count: 12 },
    { reason: 'Other', percentage: 10, count: 8 },
  ];

  const paymentMethods = [
    { method: 'Credit Card', success_rate: 98.5, volume: 78 },
    { method: 'Bank Transfer', success_rate: 99.2, volume: 15 },
    { method: 'Digital Wallet', success_rate: 97.8, volume: 7 },
  ];

  const tenantProfitability = [
    { tenant: 'AgriCorp Ltd', revenue: 2500, costs: 850, profit: 1650, margin: 66 },
    { tenant: 'FarmTech Solutions', revenue: 1800, costs: 720, profit: 1080, margin: 60 },
    { tenant: 'GreenFields Co', revenue: 1200, costs: 540, profit: 660, margin: 55 },
    { tenant: 'CropMaster Inc', revenue: 950, costs: 475, profit: 475, margin: 50 },
    { tenant: 'AgroData Systems', revenue: 800, costs: 440, profit: 360, margin: 45 },
  ];

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
            <div className="text-2xl font-bold">${currentMetrics.mrr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentMetrics.arr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +15% from last year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics.churn_rate}%</div>
            <p className="text-xs text-muted-foreground">
              -0.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer LTV</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentMetrics.ltv.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +8% from last quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Failure Rate</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics.payment_failures}%</div>
            <p className="text-xs text-muted-foreground">
              -0.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics.gross_margin}%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +2.1% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Growth</CardTitle>
            <CardDescription>Monthly revenue and customer acquisition</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  name === 'revenue' ? `$${value.toLocaleString()}` : value, 
                  name === 'revenue' ? 'Revenue' : 'New Customers'
                ]} />
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
            <CardTitle>Revenue by Tenant Type</CardTitle>
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
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Churn Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Churn Analysis
          </CardTitle>
          <CardDescription>Main reasons for customer churn</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={churnAnalysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="reason" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="percentage" fill="hsl(var(--destructive))" name="Percentage" />
              <Bar dataKey="count" fill="hsl(var(--secondary))" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method Performance
          </CardTitle>
          <CardDescription>Success rates and volume by payment method</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.method} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{method.method}</h4>
                  <p className="text-sm text-muted-foreground">
                    {method.volume}% of total volume
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{method.success_rate}%</p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tenant Profitability */}
      <Card>
        <CardHeader>
          <CardTitle>Top Profitable Tenants</CardTitle>
          <CardDescription>Revenue, costs, and profit margins by tenant</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tenantProfitability.map((tenant) => (
              <div key={tenant.tenant} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{tenant.tenant}</h4>
                  <Badge variant={tenant.margin > 60 ? 'default' : tenant.margin > 50 ? 'secondary' : 'outline'}>
                    {tenant.margin}% margin
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Revenue</p>
                    <p className="font-medium">${tenant.revenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Costs</p>
                    <p className="font-medium">${tenant.costs.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Profit</p>
                    <p className="font-medium text-green-600">${tenant.profit.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialAnalytics;
