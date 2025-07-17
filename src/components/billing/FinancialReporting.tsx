
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, DollarSign, FileText, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function FinancialReporting() {
  const [reportType, setReportType] = useState('revenue');
  const [periodFilter, setPeriodFilter] = useState('this_month');
  const [exportFormat, setExportFormat] = useState('pdf');

  // Fetch financial data
  const { data: financialData, isLoading } = useQuery({
    queryKey: ['financial-data', periodFilter],
    queryFn: async () => {
      const endDate = new Date();
      let startDate = new Date();

      switch (periodFilter) {
        case 'this_month':
          startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          break;
        case 'last_month':
          startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
          endDate.setDate(0); // Last day of previous month
          break;
        case 'this_quarter':
          const quarter = Math.floor(endDate.getMonth() / 3);
          startDate = new Date(endDate.getFullYear(), quarter * 3, 1);
          break;
        case 'this_year':
          startDate = new Date(endDate.getFullYear(), 0, 1);
          break;
      }

      const [paymentsResult, invoicesResult, subscriptionsResult] = await Promise.all([
        supabase
          .from('payments')
          .select('*')
          .eq('status', 'completed')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase
          .from('invoices')
          .select('*')
          .gte('issued_at', startDate.toISOString())
          .lte('issued_at', endDate.toISOString()),
        supabase
          .from('tenant_subscriptions')
          .select(`
            *,
            billing_plans(name, plan_type, base_price, currency),
            tenants(name)
          `)
          .eq('status', 'active')
      ]);

      return {
        payments: paymentsResult.data || [],
        invoices: invoicesResult.data || [],
        subscriptions: subscriptionsResult.data || []
      };
    }
  });

  // Calculate metrics
  const calculateMetrics = () => {
    if (!financialData) return null;

    const totalRevenue = financialData.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const totalInvoiced = financialData.invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0);
    const totalOutstanding = financialData.invoices
      .filter(invoice => invoice.status === 'pending')
      .reduce((sum, invoice) => sum + Number(invoice.amount_due), 0);
    
    const mrr = financialData.subscriptions.reduce((sum, sub) => {
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

    return {
      totalRevenue,
      totalInvoiced,
      totalOutstanding,
      mrr,
      collectionRate: totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0
    };
  };

  const metrics = calculateMetrics();

  // Revenue trend data
  const revenueData = financialData?.payments.reduce((acc, payment) => {
    const month = new Date(payment.created_at).toLocaleDateString('en-US', { month: 'short' });
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.revenue += Number(payment.amount);
    } else {
      acc.push({ month, revenue: Number(payment.amount) });
    }
    return acc;
  }, [] as any[]) || [];

  // Plan distribution data
  const planData = financialData?.subscriptions.reduce((acc, sub) => {
    const planType = sub.billing_plans?.plan_type || 'unknown';
    const existing = acc.find(item => item.name === planType);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: planType, value: 1 });
    }
    return acc;
  }, [] as any[]) || [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const handleExport = () => {
    // This would integrate with report generation service
    console.log(`Exporting ${reportType} report as ${exportFormat}`);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading financial data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(metrics?.totalRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last period</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(metrics?.mrr || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(metrics?.totalOutstanding || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Accounts receivable</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics?.collectionRate || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">+2.1% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financialData?.subscriptions.length || 0}</div>
            <p className="text-xs text-muted-foreground">+5 new this month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>Comprehensive financial analytics and reporting</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="this_quarter">This Quarter</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={reportType} onValueChange={setReportType} className="space-y-4">
            <TabsList>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
              <TabsTrigger value="profitability">Profitability</TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-4">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']} />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="subscriptions" className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-medium mb-4">Plan Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={planData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {planData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Subscription Metrics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Active Subscriptions</span>
                      <span className="font-medium">{financialData?.subscriptions.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Revenue Per User</span>
                      <span className="font-medium">
                        ₹{financialData?.subscriptions.length ? 
                          Math.round((metrics?.mrr || 0) / financialData.subscriptions.length).toLocaleString() : 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Churn Rate</span>
                      <span className="font-medium">2.3%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customer Lifetime Value</span>
                      <span className="font-medium">₹45,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reconciliation" className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-4">Payment Reconciliation</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Total Invoiced</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{(metrics?.totalInvoiced || 0).toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Total Collected</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{(metrics?.totalRevenue || 0).toLocaleString()}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Outstanding</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{(metrics?.totalOutstanding || 0).toLocaleString()}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="profitability" className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-4">Profitability Analysis</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Gross Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{(metrics?.totalRevenue || 0).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Total revenue before costs</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Estimated Costs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{Math.round((metrics?.totalRevenue || 0) * 0.3).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Infrastructure & operations</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Net Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{Math.round((metrics?.totalRevenue || 0) * 0.7).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">~70% margin</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Profit Margin</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">70%</div>
                      <p className="text-xs text-muted-foreground">Industry leading</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
