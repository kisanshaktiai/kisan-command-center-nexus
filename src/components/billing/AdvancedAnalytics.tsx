import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useBillingRealtime } from '@/hooks/useBillingRealtime';
import { ChartSkeleton, MetricCardSkeleton } from '@/components/ui/loading-skeleton';
import { useCurrency } from '@/services/billing/CurrencyService';

export function AdvancedAnalytics() {
  const { formatCurrency } = useCurrency();
  
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['billing-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_analytics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching analytics:', error);
        throw error;
      }
      
      // Calculate aggregates from the data
      const latestMetric = data?.[0];
      const previousMetric = data?.[1];
      
      return {
        arr: latestMetric?.arr || 0,
        mrr: latestMetric?.mrr || 0,
        ltv: latestMetric?.ltv || 0,
        churn_rate: latestMetric?.churn_rate || 0,
        arr_growth: previousMetric ? ((latestMetric?.arr || 0) - previousMetric.arr) / previousMetric.arr * 100 : 0,
        mrr_growth: previousMetric ? ((latestMetric?.mrr || 0) - previousMetric.mrr) / previousMetric.mrr * 100 : 0,
        payment_success_rate: latestMetric?.payment_success_rate || 0,
        average_revenue_per_user: latestMetric?.average_revenue_per_user || 0,
        chartData: data?.reverse().map(d => ({
          date: new Date(d.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          arr: d.arr,
          mrr: d.mrr,
          churn: d.churn_rate
        })) || []
      };
    },
    staleTime: 30000,
    retry: 2,
  });

  // Real-time updates for analytics
  useBillingRealtime({
    eventType: 'analytics',
    queryKey: ['billing-analytics'],
    showNotifications: false
  });

  // Remove the local formatCurrency function since we're using the hook

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Recurring Revenue (ARR)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData?.arr || 0)}</div>
            <div className="flex items-center text-xs">
              {(analyticsData?.arr_growth || 0) >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-success mr-1" />
                  <span className="text-success">+{analyticsData?.arr_growth.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-destructive mr-1" />
                  <span className="text-destructive">{analyticsData?.arr_growth.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue (MRR)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData?.mrr || 0)}</div>
            <div className="flex items-center text-xs">
              {(analyticsData?.mrr_growth || 0) >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-success mr-1" />
                  <span className="text-success">+{analyticsData?.mrr_growth.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-destructive mr-1" />
                  <span className="text-destructive">{analyticsData?.mrr_growth.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">monthly growth</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Lifetime Value (LTV)</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData?.ltv || 0)}</div>
            <p className="text-xs text-muted-foreground">Average per customer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(analyticsData?.churn_rate || 0).toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Monthly customer churn</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends</CardTitle>
          <CardDescription>ARR and MRR over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={analyticsData?.chartData || []}>
              <defs>
                <linearGradient id="colorArr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Area type="monotone" dataKey="arr" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorArr)" name="ARR" />
              <Area type="monotone" dataKey="mrr" stroke="hsl(var(--secondary))" fillOpacity={1} fill="url(#colorMrr)" name="MRR" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Success Rate</CardTitle>
            <CardDescription>Transaction success metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Success Rate</span>
                <span className="text-2xl font-bold text-success">{(analyticsData?.payment_success_rate || 0).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-success h-2 rounded-full transition-all" 
                  style={{ width: `${analyticsData?.payment_success_rate || 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                High success rate indicates healthy payment processing
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Revenue Per User (ARPU)</CardTitle>
            <CardDescription>Per customer revenue metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">ARPU</span>
                <span className="text-2xl font-bold">{formatCurrency(analyticsData?.average_revenue_per_user || 0)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Average monthly revenue generated per active user
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI-Powered Insights */}
      <Card>
        <CardHeader className="flex flex-row items-center space-x-2">
          <Zap className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>AI-Powered Insights</CardTitle>
            <CardDescription>Predictive analytics and recommendations</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(analyticsData?.churn_rate || 0) > 5 && (
              <div className="p-3 border border-warning rounded-lg bg-warning/10">
                <p className="text-sm font-medium text-warning">⚠️ Churn Alert</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Churn rate is above 5%. Consider implementing retention campaigns and analyzing customer feedback.
                </p>
              </div>
            )}
            
            {(analyticsData?.payment_success_rate || 100) < 95 && (
              <div className="p-3 border border-destructive rounded-lg bg-destructive/10">
                <p className="text-sm font-medium text-destructive">🔴 Payment Issues Detected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Payment success rate is below 95%. Review failed transactions and optimize payment retry logic.
                </p>
              </div>
            )}
            
            {(analyticsData?.mrr_growth || 0) > 10 && (
              <div className="p-3 border border-success rounded-lg bg-success/10">
                <p className="text-sm font-medium text-success">✅ Strong Growth</p>
                <p className="text-xs text-muted-foreground mt-1">
                  MRR growth exceeds 10%. Current strategies are working well. Consider scaling successful campaigns.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}