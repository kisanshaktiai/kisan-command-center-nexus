
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, Users, Crown, Calendar, MapPin, DollarSign, 
  TrendingUp, Activity, Settings, BarChart3, CreditCard,
  Globe, Mail, Phone, FileText, AlertCircle, RefreshCw
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantService } from '@/services/tenantService';
import { UsageMeter } from './UsageMeter';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Import new chart components
import { FarmersGrowthChart, RevenueChart, ApiUsageChart, StorageChart } from './charts/TenantAnalyticsChart';
import { PerformanceMetricsChart } from './charts/PerformanceMetricsChart';
import { RealTimeMetricsWidget } from './charts/RealTimeMetricsWidget';

interface TenantDetailsModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tenant: Tenant) => void;
}

interface TenantMetrics {
  usageMetrics: {
    farmers: { current: number; limit: number; percentage: number };
    dealers: { current: number; limit: number; percentage: number };
    products: { current: number; limit: number; percentage: number };
    storage: { current: number; limit: number; percentage: number };
    apiCalls: { current: number; limit: number; percentage: number };
  };
  healthScore: number;
  lastActivityDate: string;
}

interface TenantBillingData {
  mrr: number;
  totalRevenue: number;
  nextBillingDate: string;
  paymentStatus: 'current' | 'overdue' | 'failed';
  outstandingBalance: number;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  metadata: Record<string, any>;
}

interface AnalyticsData {
  usage_trends: {
    farmers: { data: number[]; labels: string[]; growth_rate: number };
    revenue: { data: number[]; labels: string[]; growth_rate: number };
    api_usage: { data: number[]; labels: string[]; growth_rate: number };
    storage: { data: number[]; labels: string[]; growth_rate: number };
  };
  performance_metrics: {
    health_score: number;
    uptime_percentage: number;
    avg_response_time: number;
    error_rate: number;
    user_satisfaction: number;
  };
  forecasting: {
    projected_growth: number;
    churn_risk: number;
    capacity_utilization: number;
  };
}

interface SettingsData {
  domain_configuration: {
    subdomain: string;
    custom_domain: string;
    ssl_status: string;
    dns_status: string;
    domain_verification: boolean;
  };
  security_settings: {
    two_factor_enabled: boolean;
    session_timeout: number;
    ip_whitelist: string[];
    api_rate_limits: {
      requests_per_hour: number;
      burst_limit: number;
    };
    last_security_scan: string;
  };
  integration_status: {
    webhooks: { active: number; total: number };
    api_keys: { active: number; total: number };
    external_services: Array<{
      name: string;
      status: 'connected' | 'disconnected' | 'error';
      last_sync: string;
    }>;
  };
  feature_flags: {
    ai_features: boolean;
    advanced_analytics: boolean;
    white_label: boolean;
    custom_branding: boolean;
    api_access: boolean;
  };
}

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onEdit,
}) => {
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [billingData, setBillingData] = useState<TenantBillingData | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [settingsData, setSettingsData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (tenant && isOpen) {
      fetchAllTenantData();
    }
  }, [tenant, isOpen]);

  const fetchAllTenantData = async () => {
    if (!tenant) return;
    
    setLoading(true);
    try {
      const [metricsResponse, billingResponse, activityResponse, analyticsResponse, settingsResponse] = await Promise.all([
        supabase.functions.invoke('tenant-limits-quotas', {
          body: { tenantId: tenant.id }
        }),
        supabase.functions.invoke('tenant-subscriptions-billing', {
          body: { tenantId: tenant.id }
        }),
        supabase.functions.invoke('tenant-activity-feed', {
          body: { tenant_id: tenant.id, limit: 20 }
        }),
        supabase.functions.invoke('tenant-analytics-data', {
          body: { tenant_id: tenant.id, period: '30d' }
        }),
        supabase.functions.invoke('tenant-settings-data', {
          body: { tenant_id: tenant.id }
        })
      ]);

      // Process metrics data
      if (metricsResponse.data && !metricsResponse.error) {
        const data = metricsResponse.data;
        setMetrics({
          usageMetrics: {
            farmers: { 
              current: data.usage.farmers, 
              limit: data.limits.farmers, 
              percentage: (data.usage.farmers / data.limits.farmers) * 100 
            },
            dealers: { 
              current: data.usage.dealers, 
              limit: data.limits.dealers, 
              percentage: (data.usage.dealers / data.limits.dealers) * 100 
            },
            products: { 
              current: data.usage.products, 
              limit: data.limits.products, 
              percentage: (data.usage.products / data.limits.products) * 100 
            },
            storage: { 
              current: data.usage.storage, 
              limit: data.limits.storage, 
              percentage: (data.usage.storage / data.limits.storage) * 100 
            },
            apiCalls: { 
              current: data.usage.api_calls, 
              limit: data.limits.api_calls, 
              percentage: (data.usage.api_calls / data.limits.api_calls) * 100 
            },
          },
          healthScore: Math.max(0, 100 - (data.usage.farmers / data.limits.farmers) * 20 - (data.usage.api_calls / data.limits.api_calls) * 30),
          lastActivityDate: new Date().toISOString(),
        });
      }

      // Process billing data
      if (billingResponse.data && !billingResponse.error) {
        setBillingData({
          mrr: billingResponse.data.billing_summary.monthly_revenue,
          totalRevenue: billingResponse.data.billing_summary.total_revenue,
          nextBillingDate: '2024-08-01',
          paymentStatus: 'current',
          outstandingBalance: billingResponse.data.billing_summary.outstanding_amount,
        });
      }

      // Process activity data
      if (activityResponse.data && !activityResponse.error) {
        setActivities(activityResponse.data.activities || []);
      }

      // Process analytics data
      if (analyticsResponse.data && !analyticsResponse.error) {
        setAnalyticsData(analyticsResponse.data);
      }

      // Process settings data
      if (settingsResponse.data && !settingsResponse.error) {
        setSettingsData(settingsResponse.data);
      }

    } catch (error) {
      console.error('Error fetching tenant data:', error);
      toast({
        title: "Error",
        description: "Failed to load tenant details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllTenantData();
    setRefreshing(false);
    toast({
      title: "Success",
      description: "Tenant data refreshed successfully",
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'api_activity': return <Activity className="h-4 w-4 text-blue-600" />;
      case 'admin_action': return <Settings className="h-4 w-4 text-purple-600" />;
      case 'security_event': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'activation': return <Users className="h-4 w-4 text-green-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">{tenant.name}</DialogTitle>
                <p className="text-muted-foreground">{tenant.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={TenantService.getStatusBadgeVariant(tenant.status)}>
                {tenant.status?.toUpperCase()}
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => onEdit(tenant)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Tenant
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Real-time Metrics Widget */}
            <RealTimeMetricsWidget tenantId={tenant.id} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Type:</span>
                      <span className="text-sm font-medium capitalize">{tenant.type?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Created:</span>
                      <span className="text-sm font-medium">{formatDate(tenant.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Plan:</span>
                      <Badge variant={TenantService.getPlanBadgeVariant(tenant.subscription_plan)}>
                        {TenantService.getPlanDisplayName(tenant.subscription_plan)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tenant.owner_name && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{tenant.owner_name}</span>
                    </div>
                  )}
                  {tenant.owner_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{tenant.owner_email}</span>
                    </div>
                  )}
                  {tenant.owner_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{tenant.owner_phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              {metrics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Health Score:</span>
                        <Badge variant={metrics.healthScore >= 80 ? 'default' : 'secondary'}>
                          {metrics.healthScore.toFixed(0)}/100
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Farmers:</span>
                        <span className="text-sm font-medium">
                          {metrics.usageMetrics.farmers.current}/{metrics.usageMetrics.farmers.limit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Dealers:</span>
                        <span className="text-sm font-medium">
                          {metrics.usageMetrics.dealers.current}/{metrics.usageMetrics.dealers.limit}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Usage Overview */}
            {metrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Usage Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <UsageMeter
                      label="Farmers"
                      current={metrics.usageMetrics.farmers.current}
                      limit={metrics.usageMetrics.farmers.limit}
                    />
                    <UsageMeter
                      label="Dealers"
                      current={metrics.usageMetrics.dealers.current}
                      limit={metrics.usageMetrics.dealers.limit}
                    />
                    <UsageMeter
                      label="Products"
                      current={metrics.usageMetrics.products.current}
                      limit={metrics.usageMetrics.products.limit}
                    />
                    <UsageMeter
                      label="Storage"
                      current={metrics.usageMetrics.storage.current}
                      limit={metrics.usageMetrics.storage.limit}
                      unit=" GB"
                    />
                    <UsageMeter
                      label="API Calls"
                      current={metrics.usageMetrics.apiCalls.current}
                      limit={metrics.usageMetrics.apiCalls.limit}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {analyticsData ? (
              <>
                {/* Performance Metrics */}
                <PerformanceMetricsChart metrics={analyticsData.performance_metrics} />

                {/* Usage Trends Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FarmersGrowthChart data={analyticsData.usage_trends.farmers} />
                  <RevenueChart data={analyticsData.usage_trends.revenue} />
                  <ApiUsageChart data={analyticsData.usage_trends.api_usage} />
                  <StorageChart data={analyticsData.usage_trends.storage} />
                </div>

                {/* Forecasting and Insights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Projected Growth</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        +{analyticsData.forecasting.projected_growth}%
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">Next 30 days</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Churn Risk</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-orange-600">
                        {analyticsData.forecasting.churn_risk}%
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">Risk level: {analyticsData.forecasting.churn_risk < 10 ? 'Low' : analyticsData.forecasting.churn_risk < 25 ? 'Medium' : 'High'}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Capacity Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">
                        {analyticsData.forecasting.capacity_utilization}%
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">Current usage</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="subscription" className="space-y-6">
            {billingData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Billing Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Monthly Revenue:</span>
                        <span className="text-sm font-medium">{formatCurrency(billingData.mrr)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Revenue:</span>
                        <span className="text-sm font-medium">{formatCurrency(billingData.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Outstanding Balance:</span>
                        <span className="text-sm font-medium">{formatCurrency(billingData.outstandingBalance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Payment Status:</span>
                        <Badge variant={billingData.paymentStatus === 'current' ? 'default' : 'destructive'}>
                          {billingData.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Plan:</span>
                        <Badge variant={TenantService.getPlanBadgeVariant(tenant.subscription_plan)}>
                          {TenantService.getPlanDisplayName(tenant.subscription_plan)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Start Date:</span>
                        <span className="text-sm font-medium">{formatDate(tenant.subscription_start_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">End Date:</span>
                        <span className="text-sm font-medium">{formatDate(tenant.subscription_end_date)}</span>
                      </div>
                      {tenant.trial_ends_at && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Trial Ends:</span>
                          <span className="text-sm font-medium">{formatDate(tenant.trial_ends_at)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.length > 0 ? (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className={`p-2 rounded-full ${getSeverityColor(activity.severity)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium">{activity.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {settingsData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Domain Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Domain Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {settingsData.domain_configuration.subdomain && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Subdomain:</span>
                          <span className="text-sm font-medium">{settingsData.domain_configuration.subdomain}</span>
                        </div>
                      )}
                      {settingsData.domain_configuration.custom_domain && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Custom Domain:</span>
                          <span className="text-sm font-medium">{settingsData.domain_configuration.custom_domain}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">SSL Status:</span>
                        <Badge variant={settingsData.domain_configuration.ssl_status === 'active' ? 'default' : 'secondary'}>
                          {settingsData.domain_configuration.ssl_status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Security Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">2FA Enabled:</span>
                        <Badge variant={settingsData.security_settings.two_factor_enabled ? 'default' : 'secondary'}>
                          {settingsData.security_settings.two_factor_enabled ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Session Timeout:</span>
                        <span className="text-sm font-medium">{settingsData.security_settings.session_timeout}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Rate Limit:</span>
                        <span className="text-sm font-medium">{settingsData.security_settings.api_rate_limits.requests_per_hour}/hour</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Integration Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Integration Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">API Keys:</span>
                        <span className="text-sm font-medium">
                          {settingsData.integration_status.api_keys.active}/{settingsData.integration_status.api_keys.total}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Webhooks:</span>
                        <span className="text-sm font-medium">
                          {settingsData.integration_status.webhooks.active}/{settingsData.integration_status.webhooks.total}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">External Services:</div>
                      {settingsData.integration_status.external_services.map((service, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{service.name}:</span>
                          <Badge variant={service.status === 'connected' ? 'default' : 'secondary'}>
                            {service.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Feature Flags */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5" />
                      Feature Flags
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">AI Features:</span>
                        <Badge variant={settingsData.feature_flags.ai_features ? 'default' : 'secondary'}>
                          {settingsData.feature_flags.ai_features ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Advanced Analytics:</span>
                        <Badge variant={settingsData.feature_flags.advanced_analytics ? 'default' : 'secondary'}>
                          {settingsData.feature_flags.advanced_analytics ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">White Label:</span>
                        <Badge variant={settingsData.feature_flags.white_label ? 'default' : 'secondary'}>
                          {settingsData.feature_flags.white_label ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Custom Branding:</span>
                        <Badge variant={settingsData.feature_flags.custom_branding ? 'default' : 'secondary'}>
                          {settingsData.feature_flags.custom_branding ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
