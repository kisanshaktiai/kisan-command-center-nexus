
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialMetrics } from '@/lib/api/queries';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, CreditCard, Users } from 'lucide-react';

const FinancialReporting: React.FC = () => {
  const { data: financialData, isLoading, error } = useFinancialMetrics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-40 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Failed to load financial data: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Process financial data
  const revenueData = Array.isArray(financialData) ? financialData
    .filter(item => item.metric_name === 'revenue')
    .sort((a, b) => new Date(a.period_start).getTime() - new Date(b.period_start).getTime())
    .map(item => ({
      period: new Date(item.period_start).toLocaleDateString(),
      amount: item.amount,
      currency: item.currency
    })) : [];

  const expenseData = Array.isArray(financialData) ? financialData
    .filter(item => item.category === 'expense')
    .reduce((acc, item) => {
      const existingItem = acc.find(a => a.category === item.category);
      if (existingItem) {
        existingItem.amount += item.amount;
      } else {
        acc.push({
          category: item.category,
          amount: item.amount
        });
      }
      return acc;
    }, [] as Array<{ category: string; amount: number }>) : [];

  const categoryBreakdown = Array.isArray(financialData) ? financialData
    .filter(item => item.metric_name === 'subscription_revenue')
    .reduce((acc, item) => {
      // Safely parse metadata
      let breakdown: any = {};
      try {
        if (typeof item.metadata === 'string') {
          breakdown = JSON.parse(item.metadata);
        } else if (typeof item.metadata === 'object' && item.metadata !== null) {
          breakdown = item.metadata;
        }
      } catch (e) {
        console.warn('Failed to parse metadata:', e);
      }

      const category = breakdown?.category || 'other';
      const existingItem = acc.find(a => a.name === category);
      if (existingItem) {
        existingItem.value += item.amount;
      } else {
        acc.push({
          name: category,
          value: item.amount
        });
      }
      return acc;
    }, [] as Array<{ name: string; value: number }>) : [];

  // Calculate totals
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenseData.reduce((sum, item) => sum + item.amount, 0);
  const netIncome = totalRevenue - totalExpenses;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${netIncome.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(financialData) ? 
                financialData.filter(item => item.metric_name === 'active_subscriptions').length : 0
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
              <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FinancialReporting;
