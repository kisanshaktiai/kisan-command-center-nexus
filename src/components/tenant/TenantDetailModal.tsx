
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Users, 
  Calendar, 
  MapPin, 
  Mail, 
  Phone, 
  FileText,
  Edit,
  Trash2,
  X,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  DollarSign,
  Clock,
  Shield,
  Zap
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantService } from '@/services/tenantService';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

interface TenantDetailModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
}

export const TenantDetailModal: React.FC<TenantDetailModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const [realtimeData, setRealtimeData] = useState({
    usage: [
      { name: 'Jan', farmers: 120, dealers: 8, apiCalls: 2400 },
      { name: 'Feb', farmers: 280, dealers: 15, apiCalls: 4800 },
      { name: 'Mar', farmers: 450, dealers: 22, apiCalls: 7200 },
      { name: 'Apr', farmers: 620, dealers: 28, apiCalls: 9600 },
      { name: 'May', farmers: 780, dealers: 35, apiCalls: 12000 },
      { name: 'Jun', farmers: 920, dealers: 42, apiCalls: 14400 }
    ],
    metrics: [
      { name: 'Week 1', active: 85, revenue: 1200 },
      { name: 'Week 2', active: 92, revenue: 1580 },
      { name: 'Week 3', active: 78, revenue: 1350 },
      { name: 'Week 4', active: 96, revenue: 1890 }
    ]
  });

  useEffect(() => {
    if (isOpen && tenant) {
      // Simulate real-time data updates
      const interval = setInterval(() => {
        setRealtimeData(prev => ({
          ...prev,
          usage: prev.usage.map(item => ({
            ...item,
            farmers: item.farmers + Math.floor(Math.random() * 10),
            apiCalls: item.apiCalls + Math.floor(Math.random() * 200)
          }))
        }));
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isOpen, tenant]);

  if (!tenant) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFeatureCount = () => {
    if (!tenant.features) return 0;
    return Object.values(tenant.features).filter(Boolean).length;
  };

  const getBusinessAddress = () => {
    if (!tenant.business_address) return 'Not specified';
    if (typeof tenant.business_address === 'string') {
      return tenant.business_address;
    }
    return tenant.business_address?.city || 'Not specified';
  };

  const getPlanLimits = () => {
    return TenantService.getPlanLimits(tenant.subscription_plan);
  };

  const chartConfig = {
    farmers: {
      label: "Farmers",
      color: "hsl(var(--chart-1))",
    },
    dealers: {
      label: "Dealers", 
      color: "hsl(var(--chart-2))",
    },
    apiCalls: {
      label: "API Calls",
      color: "hsl(var(--chart-3))",
    },
    active: {
      label: "Active Users",
      color: "hsl(var(--chart-4))",
    },
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-5))",
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">{tenant.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">@{tenant.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={TenantService.getStatusBadgeVariant(tenant.status)}>
              {tenant.status?.toUpperCase()}
            </Badge>
            <Badge variant={TenantService.getPlanBadgeVariant(tenant.subscription_plan)}>
              {TenantService.getPlanDisplayName(tenant.subscription_plan)}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(tenant)}
              className="flex items-center gap-1"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(tenant.id)}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Basic Information */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Type:</span>
                    <p className="font-medium capitalize">{tenant.type?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Created:</span>
                    <p className="font-medium">{formatDate(tenant.created_at)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Updated:</span>
                    <p className="font-medium">{formatDate(tenant.updated_at)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Subdomain:</span>
                    <p className="font-medium">{tenant.subdomain || 'Not set'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Owner Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tenant.owner_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-muted-foreground">Name:</span>
                    <span className="font-medium">{tenant.owner_name}</span>
                  </div>
                )}
                {tenant.owner_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{tenant.owner_email}</span>
                  </div>
                )}
                {tenant.owner_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{tenant.owner_phone}</span>
                  </div>
                )}
                {tenant.business_registration && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{tenant.business_registration}</span>
                  </div>
                )}
                {tenant.business_address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{getBusinessAddress()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Plan Limits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{tenant.max_farmers?.toLocaleString() || '0'}</div>
                    <div className="text-muted-foreground">Farmers</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{tenant.max_dealers?.toLocaleString() || '0'}</div>
                    <div className="text-muted-foreground">Dealers</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{tenant.max_products?.toLocaleString() || '0'}</div>
                    <div className="text-muted-foreground">Products</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{tenant.max_storage_gb || '0'} GB</div>
                    <div className="text-muted-foreground">Storage</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Charts and Analytics */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Usage Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={realtimeData.usage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="farmers" 
                        stackId="1" 
                        stroke={chartConfig.farmers.color}
                        fill={chartConfig.farmers.color}
                        fillOpacity={0.8}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="dealers" 
                        stackId="1" 
                        stroke={chartConfig.dealers.color}
                        fill={chartConfig.dealers.color}
                        fillOpacity={0.8}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    API Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={realtimeData.usage}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="apiCalls" 
                          stroke={chartConfig.apiCalls.color}
                          strokeWidth={2}
                          dot={{ fill: chartConfig.apiCalls.color, strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={realtimeData.metrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="active" 
                          fill={chartConfig.active.color}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Subscription Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Plan:</span>
                    <p className="font-medium">{TenantService.getPlanDisplayName(tenant.subscription_plan)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Start Date:</span>
                    <p className="font-medium">{formatDate(tenant.subscription_start_date)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Trial Ends:</span>
                    <p className="font-medium">{formatDate(tenant.trial_ends_at)}</p>
                  </div>
                </div>
                
                {tenant.status === 'trial' && tenant.trial_ends_at && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Trial ending on {formatDate(tenant.trial_ends_at)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Features ({getFeatureCount()} enabled)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tenant.features && Object.keys(tenant.features).length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(tenant.features).map(([feature, enabled]) => (
                      <div key={feature} className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className={enabled ? 'text-foreground' : 'text-muted-foreground'}>
                          {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No features configured</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
