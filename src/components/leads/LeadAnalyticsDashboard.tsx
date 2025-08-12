
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useConversionFunnel, useLeadPerformance, useSourceEffectiveness } from '@/hooks/useLeadAnalytics';
import { useLeadAnalyticsRealtime } from '@/hooks/useLeadAnalyticsRealtime';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface LeadAnalyticsDashboardProps {
  open?: boolean;
  onClose?: () => void;
}

export const LeadAnalyticsDashboard: React.FC<LeadAnalyticsDashboardProps> = ({
  open,
  onClose
}) => {
  // Set up real-time subscriptions
  useLeadAnalyticsRealtime();

  // Default to last 30 days
  const dateRange = useMemo(() => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { start, end };
  }, []);

  // Fetch real-time data
  const { data: conversionData, isLoading: conversionLoading, error: conversionError, refetch: refetchConversion } = useConversionFunnel(dateRange);
  const { data: performanceData, isLoading: performanceLoading, error: performanceError, refetch: refetchPerformance } = useLeadPerformance(dateRange);
  const { data: sourceData, isLoading: sourceLoading, error: sourceError, refetch: refetchSource } = useSourceEffectiveness(dateRange);

  const isLoading = conversionLoading || performanceLoading || sourceLoading;
  const hasError = conversionError || performanceError || sourceError;

  // Handle refresh
  const handleRefresh = () => {
    refetchConversion();
    refetchPerformance();
    refetchSource();
  };

  // Process conversion funnel data for charts
  const statusData = useMemo(() => {
    if (!conversionData?.funnel) return [];
    
    const colors = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#6B7280'];
    
    return Object.entries(conversionData.funnel).map(([status, count], index) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      count: count as number,
      color: colors[index] || '#6B7280'
    }));
  }, [conversionData]);

  // Process source effectiveness data for charts
  const sourceChartData = useMemo(() => {
    if (!sourceData) return [];
    
    return Object.entries(sourceData).map(([source, stats]: [string, any]) => ({
      name: source.charAt(0).toUpperCase() + source.slice(1),
      count: stats.total || 0,
      conversionRate: Math.round(stats.conversionRate || 0)
    }));
  }, [sourceData]);

  if (open === false) {
    return null;
  }

  if (hasError) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">Lead Analytics Dashboard</h2>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive mb-4 text-sm font-medium">Failed to load analytics data</p>
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lead Analytics Dashboard</h2>
          <p className="text-muted-foreground text-sm">
            Real-time analytics for the last 30 days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Total Leads</CardDescription>
                <CardTitle className="text-2xl">{conversionData?.total || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Conversion Rate</CardDescription>
                <CardTitle className="text-2xl text-info">
                  {conversionData?.conversions?.qualified_to_converted ? 
                    `${Math.round(conversionData.conversions.qualified_to_converted)}%` : '0%'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Qualified to converted</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Avg. Performance Score</CardDescription>
                <CardTitle className="text-2xl text-[hsl(var(--success))]">
                  {performanceData?.avgScore ? Math.round(performanceData.avgScore) : 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Lead quality score</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Active Sources</CardDescription>
                <CardTitle className="text-2xl text-[hsl(var(--info))]">
                  {sourceChartData.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Lead sources</p>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Status Distribution</CardTitle>
              <CardDescription>
                Current distribution of leads across different statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  {statusData.map((status) => (
                    <div key={status.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-sm">{status.name}</span>
                      </div>
                      <Badge variant="secondary">{status.count}</Badge>
                    </div>
                  ))}
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lead Sources Effectiveness */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Sources Performance</CardTitle>
              <CardDescription>
                Performance metrics by lead source
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'count' ? `${value} leads` : `${value}%`,
                        name === 'count' ? 'Total Leads' : 'Conversion Rate'
                      ]}
                    />
                    <Bar dataKey="count" fill="#10B981" name="count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Performance Insights */}
          {performanceData && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
                <CardDescription>
                  Key performance metrics and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(performanceData.avgTimeToContact || 0)}h
                    </div>
                    <p className="text-sm text-muted-foreground">Avg. Time to Contact</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(performanceData.avgTimeToConversion || 0)}d
                    </div>
                    <p className="text-sm text-muted-foreground">Avg. Time to Convert</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {performanceData.topPerformers?.length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Top Performers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
