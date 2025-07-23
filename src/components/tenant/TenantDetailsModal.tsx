
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, Users, Crown, Calendar, MapPin, DollarSign, 
  TrendingUp, Activity, Settings, BarChart3, CreditCard,
  Globe, Mail, Phone, FileText, AlertCircle 
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantService } from '@/services/tenantService';
import { TenantMetrics, TenantBillingData } from '@/types/tenantView';
import { UsageMeter } from './UsageMeter';
import { TrendChart } from './TrendChart';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TenantDetailsModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tenant: Tenant) => void;
}

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onEdit,
}) => {
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [billingData, setBillingData] = useState<TenantBillingData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (tenant && isOpen) {
      fetchTenantData();
    }
  }, [tenant, isOpen]);

  const fetchTenantData = async () => {
    if (!tenant) return;
    
    setLoading(true);
    try {
      // Fetch metrics and billing data using edge functions
      const [metricsResponse, billingResponse] = await Promise.all([
        supabase.functions.invoke('tenant-limits-quotas', {
          body: { tenantId: tenant.id }
        }),
        supabase.functions.invoke('tenant-subscriptions-billing', {
          body: { tenantId: tenant.id }
        })
      ]);

      if (metricsResponse.data) {
        // Transform response to metrics format
        setMetrics({
          usageMetrics: {
            farmers: { current: metricsResponse.data.usage.farmers, limit: metricsResponse.data.limits.farmers, percentage: 0 },
            dealers: { current: metricsResponse.data.usage.dealers, limit: metricsResponse.data.limits.dealers, percentage: 0 },
            products: { current: metricsResponse.data.usage.products, limit: metricsResponse.data.limits.products, percentage: 0 },
            storage: { current: metricsResponse.data.usage.storage, limit: metricsResponse.data.limits.storage, percentage: 0 },
            apiCalls: { current: metricsResponse.data.usage.api_calls, limit: metricsResponse.data.limits.api_calls, percentage: 0 },
          },
          growthTrends: {
            farmers: [10, 15, 25, 30, 45, 50, 65],
            revenue: [1000, 1200, 1500, 1800, 2100, 2400, 2700],
            apiUsage: [100, 150, 200, 250, 300, 350, 400],
          },
          healthScore: 85,
          lastActivityDate: new Date().toISOString(),
        });
      }

      if (billingResponse.data) {
        setBillingData({
          mrr: billingResponse.data.billing_summary.monthly_revenue,
          totalRevenue: billingResponse.data.billing_summary.total_revenue,
          nextBillingDate: '2024-08-01',
          paymentStatus: 'current',
          outstandingBalance: billingResponse.data.billing_summary.outstanding_amount,
        });
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
                          {metrics.healthScore}/100
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
            {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Growth Trends</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <TrendChart
                      data={metrics.growthTrends.farmers}
                      label="Farmer Growth"
                      color="#10B981"
                      height={100}
                    />
                    <TrendChart
                      data={metrics.growthTrends.revenue}
                      label="Revenue Growth"
                      color="#3B82F6"
                      height={100}
                    />
                    <TrendChart
                      data={metrics.growthTrends.apiUsage}
                      label="API Usage Growth"
                      color="#8B5CF6"
                      height={100}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Health Score</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={metrics.healthScore >= 80 ? 'default' : 'secondary'}>
                            {metrics.healthScore}/100
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Last Activity</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(metrics.lastActivityDate)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">New farmer registered</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Payment processed successfully</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Settings className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Configuration updated</p>
                      <p className="text-xs text-muted-foreground">3 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Domain & Branding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {tenant.subdomain && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Subdomain:</span>
                        <span className="text-sm font-medium">{tenant.subdomain}</span>
                      </div>
                    )}
                    {tenant.custom_domain && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Custom Domain:</span>
                        <span className="text-sm font-medium">{tenant.custom_domain}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Business Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {tenant.business_registration && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Registration:</span>
                        <span className="text-sm font-medium">{tenant.business_registration}</span>
                      </div>
                    )}
                    {tenant.established_date && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Established:</span>
                        <span className="text-sm font-medium">{formatDate(tenant.established_date)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
