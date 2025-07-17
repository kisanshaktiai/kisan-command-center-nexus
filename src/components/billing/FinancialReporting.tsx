
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, FileText, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FinancialData {
  payments: any[];
  invoices: any[];
  subscriptions: any[];
}

export function FinancialReporting() {
  const [dateRange, setDateRange] = useState<any>(null);
  const [reportType, setReportType] = useState<string>('revenue');

  // Use mock data until billing tables are available
  const { data: financialData, isLoading } = useQuery({
    queryKey: ['financial-data', dateRange],
    queryFn: async (): Promise<FinancialData> => {
      try {
        // For now, return mock data since billing tables may not be available
        return {
          payments: [
            { id: '1', amount: 50000, status: 'completed', created_at: new Date().toISOString() },
            { id: '2', amount: 75000, status: 'completed', created_at: new Date().toISOString() },
          ],
          invoices: [
            { id: '1', amount_due: 25000, status: 'pending', created_at: new Date().toISOString() },
            { id: '2', amount_due: 0, status: 'paid', created_at: new Date().toISOString() },
          ],
          subscriptions: [
            { id: '1', created_at: new Date().toISOString(), billing_plans: { base_price: 10000, billing_interval: 'monthly' } },
          ]
        };
      } catch (error) {
        console.error('Error fetching financial data:', error);
        return {
          payments: [],
          invoices: [],
          subscriptions: []
        };
      }
    }
  });

  // Calculate financial metrics with safe property access
  const calculateMetrics = () => {
    if (!financialData) return { totalRevenue: 0, pendingAmount: 0, completedPayments: 0, overdueInvoices: 0 };

    const totalRevenue = financialData.payments
      .filter(payment => payment?.status === 'completed')
      .reduce((sum, payment) => sum + (Number(payment?.amount) || 0), 0);

    const pendingAmount = financialData.invoices
      .filter(invoice => invoice?.status === 'pending')
      .reduce((sum, invoice) => sum + (Number(invoice?.amount_due) || 0), 0);

    const completedPayments = financialData.payments.filter(payment => payment?.status === 'completed').length;
    const overdueInvoices = financialData.invoices.filter(invoice => invoice?.status === 'overdue').length;

    return { totalRevenue, pendingAmount, completedPayments, overdueInvoices };
  };

  // Generate MRR data with proper error handling
  const generateMRRData = () => {
    if (!financialData?.subscriptions) return [];

    const mrrByMonth: { [key: string]: number } = {};
    
    financialData.subscriptions.forEach(sub => {
      if (!sub?.billing_plans) return;
      
      const date = new Date(sub.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      let monthlyPrice = Number(sub.billing_plans.base_price) || 0;
      if (sub.billing_plans.billing_interval === 'quarterly') {
        monthlyPrice = monthlyPrice / 3;
      } else if (sub.billing_plans.billing_interval === 'annually') {
        monthlyPrice = monthlyPrice / 12;
      }
      
      mrrByMonth[monthKey] = (mrrByMonth[monthKey] || 0) + monthlyPrice;
    });

    return Object.entries(mrrByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: Math.round(revenue)
      }));
  };

  // Generate revenue trends with safe property access
  const generateRevenueTrends = () => {
    if (!financialData?.payments) return [];

    const revenueByMonth: { [key: string]: number } = {};
    
    financialData.payments.forEach(payment => {
      if (payment?.status !== 'completed') return;
      
      const date = new Date(payment.created_at || Date.now());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + (Number(payment?.amount) || 0);
    });

    return Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: Math.round(amount)
      }));
  };

  const metrics = calculateMetrics();
  const mrrData = generateMRRData();
  const revenueData = generateRevenueTrends();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">Loading financial data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Financial Reporting</h1>
          <p className="text-muted-foreground">Comprehensive financial analytics and reporting</p>
        </div>
        <div className="flex gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue Report</SelectItem>
              <SelectItem value="subscriptions">Subscription Report</SelectItem>
              <SelectItem value="invoices">Invoice Report</SelectItem>
              <SelectItem value="payments">Payment Report</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From completed payments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics.pendingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From pending invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedPayments}</div>
            <p className="text-xs text-muted-foreground">Successful transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overdueInvoices}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
          <TabsTrigger value="mrr">MRR Tracking</TabsTrigger>
          <TabsTrigger value="breakdown">Revenue Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Monthly revenue from payments</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mrr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Recurring Revenue (MRR)</CardTitle>
              <CardDescription>Subscription-based recurring revenue tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mrrData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'MRR']} />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Payment Status Distribution</CardTitle>
                <CardDescription>Breakdown of payment statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <span className="font-medium">{financialData?.payments.filter(p => p?.status === 'completed').length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending</span>
                    <span className="font-medium">{financialData?.payments.filter(p => p?.status === 'pending').length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed</span>
                    <span className="font-medium">{financialData?.payments.filter(p => p?.status === 'failed').length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Status Distribution</CardTitle>
                <CardDescription>Breakdown of invoice statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Paid</span>
                    <span className="font-medium">{financialData?.invoices.filter(i => i?.status === 'paid').length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending</span>
                    <span className="font-medium">{financialData?.invoices.filter(i => i?.status === 'pending').length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overdue</span>
                    <span className="font-medium">{financialData?.invoices.filter(i => i?.status === 'overdue').length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
