
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard,
  Users,
  Calendar,
  Download,
  FileText
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useFinancialAnalytics } from '@/lib/api/queries';

const FinancialReporting = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [reportType, setReportType] = useState('revenue');
  
  const { data: financialData = [], isLoading } = useFinancialAnalytics(timeRange);

  // Process real financial data based on actual schema
  const processedData = React.useMemo(() => {
    if (!financialData || financialData.length === 0) {
      return {
        revenue: [],
        expenses: [],
        subscriptions: [],
        summary: {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          growthRate: 0,
          activeSubscriptions: 0,
          churnRate: 0
        }
      };
    }

    // Group data by metric type using actual schema fields
    const revenueData = financialData
      .filter(item => item.metric_type === 'revenue')
      .map(item => ({
        date: new Date(item.period_start).toLocaleDateString(),
        value: Number(item.amount),
        period: item.period_type
      }));

    const expenseData = financialData
      .filter(item => item.metric_type === 'expenses')
      .map(item => ({
        date: new Date(item.period_start).toLocaleDateString(),
        value: Number(item.amount),
        category: item.breakdown ? (item.breakdown as any).category || 'Other' : 'Other'
      }));

    const subscriptionData = financialData
      .filter(item => item.metric_type === 'subscriptions')
      .map(item => ({
        date: new Date(item.period_start).toLocaleDateString(),
        active: item.breakdown ? Number((item.breakdown as any).active_count || 0) : 0,
        new: item.breakdown ? Number((item.breakdown as any).new_count || 0) : 0,
        churned: item.breakdown ? Number((item.breakdown as any).churned_count || 0) : 0
      }));

    // Calculate summary metrics
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.value, 0);
    const totalExpenses = expenseData.reduce((sum, item) => sum + item.value, 0);
    const netProfit = totalRevenue - totalExpenses;
    const growthRate = revenueData.length > 1 ? 
      ((revenueData[revenueData.length - 1].value - revenueData[0].value) / revenueData[0].value) * 100 : 0;
    
    const latestSubscriptions = subscriptionData[subscriptionData.length - 1];
    const activeSubscriptions = latestSubscriptions?.active || 0;
    const churnRate = latestSubscriptions ? 
      (latestSubscriptions.churned / (latestSubscriptions.active + latestSubscriptions.churned)) * 100 : 0;

    return {
      revenue: revenueData,
      expenses: expenseData,
      subscriptions: subscriptionData,
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        growthRate,
        activeSubscriptions,
        churnRate
      }
    };
  }, [financialData]);

  const exportReport = () => {
    // Create CSV export functionality
    const csvData = financialData.map(row => ({
      Date: row.period_start,
      Type: row.metric_type,
      Amount: row.amount,
      Category: row.breakdown ? (row.breakdown as any).category || 'N/A' : 'N/A',
      Period: row.period_type
    }));
    
    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${timeRange}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue Analysis</SelectItem>
              <SelectItem value="expenses">Expense Breakdown</SelectItem>
              <SelectItem value="subscriptions">Subscription Metrics</SelectItem>
              <SelectItem value="overview">Financial Overview</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={exportReport} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${processedData.summary.totalRevenue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {processedData.summary.growthRate >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
              )}
              {Math.abs(processedData.summary.growthRate).toFixed(1)}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${processedData.summary.netProfit.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              Margin: {((processedData.summary.netProfit / processedData.summary.totalRevenue) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processedData.summary.activeSubscriptions.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              Churn rate: {processedData.summary.churnRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${processedData.summary.totalExpenses.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              Operating costs
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {reportType === 'revenue' && 'Revenue Trends'}
            {reportType === 'expenses' && 'Expense Analysis'}
            {reportType === 'subscriptions' && 'Subscription Metrics'}
            {reportType === 'overview' && 'Financial Overview'}
          </CardTitle>
          <CardDescription>
            {reportType === 'revenue' && 'Track revenue performance over time'}
            {reportType === 'expenses' && 'Monitor expense categories and trends'}
            {reportType === 'subscriptions' && 'Analyze subscription growth and churn'}
            {reportType === 'overview' && 'Complete financial performance summary'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            {reportType === 'revenue' && (
              <AreaChart data={processedData.revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              </AreaChart>
            )}
            
            {reportType === 'expenses' && (
              <BarChart data={processedData.expenses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Expenses']} />
                <Bar dataKey="value" fill="hsl(var(--secondary))" />
              </BarChart>
            )}
            
            {reportType === 'subscriptions' && (
              <LineChart data={processedData.subscriptions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="active" stroke="hsl(var(--primary))" name="Active" />
                <Line type="monotone" dataKey="new" stroke="hsl(var(--secondary))" name="New" />
                <Line type="monotone" dataKey="churned" stroke="hsl(var(--destructive))" name="Churned" />
              </LineChart>
            )}
            
            {reportType === 'overview' && (
              <AreaChart data={processedData.revenue.map((rev, idx) => ({
                ...rev,
                expenses: processedData.expenses[idx]?.value || 0,
                profit: rev.value - (processedData.expenses[idx]?.value || 0)
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
                <Area type="monotone" dataKey="value" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" name="Revenue" />
                <Area type="monotone" dataKey="expenses" stackId="2" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" name="Expenses" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Additional Insights */}
      {financialData.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Financial Data Available</h3>
            <p className="text-muted-foreground">
              Financial data will appear here once transactions and subscriptions are processed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FinancialReporting;
