
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Users, 
  Zap, 
  Database, 
  Activity,
  Edit,
  TrendingUp,
  Calendar,
  Globe,
  CreditCard,
  Shield,
  BarChart3,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
  Crown
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { FormattedTenantData } from '@/services/TenantDisplayService';
import { TenantMetrics } from '@/types/tenantView';
import { TenantEmailActions } from './TenantEmailActions';
import { UsageMeter } from './UsageMeter';
import { TrendChart } from './TrendChart';

interface TenantDetailsModalEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tenant: Tenant) => void;
  tenant: Tenant | null;
  formattedData: FormattedTenantData | null;
  metrics?: TenantMetrics;
}

export const TenantDetailsModalEnhanced: React.FC<TenantDetailsModalEnhancedProps> = ({
  isOpen,
  onClose,
  onEdit,
  tenant,
  formattedData,
  metrics
}) => {
  if (!tenant || !formattedData) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'trial': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'suspended': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return CheckCircle;
      case 'trial': return Clock;
      case 'suspended': return AlertCircle;
      default: return Activity;
    }
  };

  const StatusIcon = getStatusIcon(tenant.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 overflow-hidden bg-gradient-to-br from-slate-50 to-white border-0 shadow-2xl">
        {/* Enhanced Header with Gradient */}
        <DialogHeader className="relative px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white mb-2">
                  {formattedData.name}
                </DialogTitle>
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${getStatusColor(tenant.status)} bg-white/90`}>
                    <StatusIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {formattedData.displayStatus}
                    </span>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                    <Crown className="h-3 w-3 mr-1" />
                    {formattedData.planDisplayName}
                  </Badge>
                  {metrics && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-100 rounded-full border border-green-300/30">
                      <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                      <span className="text-xs font-medium">Live Data</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-8">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-8 bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Activity className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="subscription" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <CreditCard className="h-4 w-4" />
                  Subscription
                </TabsTrigger>
                <TabsTrigger value="configuration" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Settings className="h-4 w-4" />
                  Configuration
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Shield className="h-4 w-4" />
                  Security
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Basic Information Card */}
                  <Card className="lg:col-span-2 border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        Organization Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <span className="text-sm font-medium text-blue-700">Organization Name</span>
                            <p className="font-semibold text-gray-900 mt-1">{formattedData.name}</p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                            <span className="text-sm font-medium text-purple-700">Slug</span>
                            <p className="font-mono text-sm bg-white px-3 py-2 rounded-lg border mt-2">
                              {formattedData.slug}
                            </p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                            <span className="text-sm font-medium text-green-700">Organization Type</span>
                            <p className="font-semibold text-gray-900 mt-1">{formattedData.displayType}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                            <span className="text-sm font-medium text-orange-700 flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Created
                            </span>
                            <p className="font-semibold text-gray-900 mt-1">{formattedData.formattedCreatedAt}</p>
                          </div>
                          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                            <span className="text-sm font-medium text-indigo-700 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Last Updated
                            </span>
                            <p className="font-semibold text-gray-900 mt-1">{formattedData.formattedUpdatedAt}</p>
                          </div>
                          {metrics?.healthScore && (
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                              <span className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Health Score
                              </span>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="text-2xl font-bold text-emerald-600">
                                  {metrics.healthScore}
                                </div>
                                <span className="text-sm text-emerald-600">/100</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contact Information Card */}
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Users className="h-5 w-5 text-green-600" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <span className="text-sm font-medium text-blue-700 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Owner Email
                        </span>
                        <p className="font-semibold text-gray-900 mt-1 break-all">{formattedData.ownerEmail}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                        <span className="text-sm font-medium text-green-700 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Owner Name
                        </span>
                        <p className="font-semibold text-gray-900 mt-1">{formattedData.ownerName}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <span className="text-sm font-medium text-purple-700 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone
                        </span>
                        <p className="font-semibold text-gray-900 mt-1">{formattedData.ownerPhone}</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                        <span className="text-sm font-medium text-orange-700 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Business Address
                        </span>
                        <p className="font-medium text-gray-900 text-sm leading-relaxed mt-1">
                          {formattedData.formattedBusinessAddress}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                {metrics?.usageMetrics && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Activity className="h-5 w-5 text-green-600" />
                        Real-time Usage Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <UsageMeter 
                        label="Farmers" 
                        current={metrics.usageMetrics.farmers.current} 
                        limit={metrics.usageMetrics.farmers.limit} 
                        showDetails
                      />
                      <UsageMeter 
                        label="Dealers" 
                        current={metrics.usageMetrics.dealers.current} 
                        limit={metrics.usageMetrics.dealers.limit} 
                        showDetails
                      />
                      <UsageMeter 
                        label="Storage" 
                        current={metrics.usageMetrics.storage.current} 
                        limit={metrics.usageMetrics.storage.limit} 
                        unit="GB"
                        showDetails
                      />
                      <UsageMeter 
                        label="API Calls/Day" 
                        current={metrics.usageMetrics.apiCalls.current} 
                        limit={metrics.usageMetrics.apiCalls.limit} 
                        showDetails
                      />
                    </CardContent>
                  </Card>
                )}

                {metrics?.growthTrends && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Growth Trends (7 days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <TrendChart 
                          data={metrics.growthTrends.farmers} 
                          label="Farmers" 
                          color="hsl(var(--chart-1))"
                        />
                        <TrendChart 
                          data={metrics.growthTrends.revenue} 
                          label="Revenue (₹)" 
                          color="hsl(var(--chart-2))" 
                        />
                        <TrendChart 
                          data={metrics.growthTrends.apiUsage} 
                          label="API Usage" 
                          color="hsl(var(--chart-3))"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Subscription Tab */}
              <TabsContent value="subscription" className="space-y-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                      Subscription Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                          <span className="text-sm font-medium text-purple-700">Plan</span>
                          <p className="font-semibold text-gray-900 mt-1">{formattedData.planDisplayName}</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                          <span className="text-sm font-medium text-blue-700">Status</span>
                          <p className="font-semibold text-gray-900 mt-1">{formattedData.displayStatus}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                          <span className="text-sm font-medium text-green-700 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Max Farmers
                          </span>
                          <p className="font-bold text-2xl text-gray-900 mt-1">{formattedData.limitsDisplay.farmers}</p>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                          <span className="text-sm font-medium text-orange-700 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Max Dealers
                          </span>
                          <p className="font-bold text-2xl text-gray-900 mt-1">{formattedData.limitsDisplay.dealers}</p>
                        </div>
                      </div>
                    </div>
                    <Separator className="my-6" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                        <span className="text-sm font-medium text-indigo-700 flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          Storage Limit
                        </span>
                        <p className="font-bold text-2xl text-gray-900 mt-1">{formattedData.limitsDisplay.storage}</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <span className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          API Calls/Day
                        </span>
                        <p className="font-bold text-2xl text-gray-900 mt-1">{formattedData.limitsDisplay.apiCalls}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Configuration Tab */}
              <TabsContent value="configuration" className="space-y-6">
                {(formattedData.domainInfo.subdomain || formattedData.domainInfo.customDomain) && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Globe className="h-5 w-5 text-blue-600" />
                        Domain Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {formattedData.domainInfo.subdomain && (
                          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <span className="text-sm font-medium text-blue-700">Subdomain</span>
                            <p className="font-mono text-sm bg-white px-3 py-2 rounded-lg border mt-2 break-all">
                              {formattedData.domainInfo.subdomain}
                            </p>
                          </div>
                        )}
                        {formattedData.domainInfo.customDomain && (
                          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                            <span className="text-sm font-medium text-purple-700">Custom Domain</span>
                            <p className="font-mono text-sm bg-white px-3 py-2 rounded-lg border mt-2 break-all">
                              {formattedData.domainInfo.customDomain}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Shield className="h-5 w-5 text-red-600" />
                      Security & Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                        <span className="text-sm font-medium text-green-700">Account Status</span>
                        <p className="font-semibold text-green-600 mt-1">Active & Verified</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <span className="text-sm font-medium text-blue-700">Last Activity</span>
                        <p className="font-semibold text-gray-900 mt-1">{formattedData.formattedUpdatedAt}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Enhanced Action Footer */}
        <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-slate-50 to-white border-t border-slate-200">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-slate-400" />
            <span className="text-sm text-slate-600">
              Last activity: {formattedData.formattedUpdatedAt}
            </span>
            {metrics && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium">Live Analytics</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <TenantEmailActions tenant={tenant} />
            <Button variant="outline" onClick={() => onEdit(tenant)} className="hover:bg-blue-50 hover:border-blue-300">
              <Edit className="h-4 w-4 mr-2" />
              Edit Tenant
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
