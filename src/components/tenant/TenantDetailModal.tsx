
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Users, Package, DollarSign, Globe, Mail, Phone, Building } from 'lucide-react';
import { Tenant } from '@/types/tenant';

interface TenantDetailModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
}

interface PerformanceMetric {
  metric_date: string;
  metric_value: number;
  metric_type: string;
}

export const TenantDetailModal: React.FC<TenantDetailModalProps> = ({
  tenant,
  isOpen,
  onClose,
}) => {
  // Mock performance data since we can't access the new table yet
  const mockPerformanceData: PerformanceMetric[] = [
    { metric_date: '2024-01-01', metric_value: 45, metric_type: 'users_active' },
    { metric_date: '2024-01-02', metric_value: 52, metric_type: 'users_active' },
    { metric_date: '2024-01-03', metric_value: 48, metric_type: 'users_active' },
    { metric_date: '2024-01-04', metric_value: 61, metric_type: 'users_active' },
    { metric_date: '2024-01-05', metric_value: 55, metric_type: 'users_active' },
  ];

  // Transform data for charts
  const chartData = mockPerformanceData
    .filter(metric => metric.metric_type === 'users_active')
    .map(metric => ({
      date: new Date(metric.metric_date).toLocaleDateString(),
      users: metric.metric_value,
    }));

  if (!tenant) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'trial': return 'bg-blue-500';
      case 'suspended': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'AI_Enterprise': return 'bg-purple-500';
      case 'Shakti_Growth': return 'bg-green-500';
      case 'Kisan_Basic': return 'bg-blue-500';
      case 'custom': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building className="h-6 w-6" />
            {tenant.name}
            <Badge className={`${getStatusColor(tenant.status)} text-white ml-2`}>
              {tenant.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Organization Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Slug</label>
                  <p className="font-mono text-sm">{tenant.slug}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="capitalize">{tenant.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Plan</label>
                  <Badge className={`${getPlanColor(tenant.subscription_plan)} text-white`}>
                    {tenant.subscription_plan}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {tenant.owner_email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact</label>
                  <div className="space-y-1">
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {tenant.owner_email}
                    </p>
                    {tenant.owner_phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {tenant.owner_phone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {tenant.custom_domain && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Custom Domain</label>
                  <p className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {tenant.custom_domain}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resource Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Resource Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Farmers</span>
                    <span className="font-medium">{tenant.max_farmers?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Dealers</span>
                    <span className="font-medium">{tenant.max_dealers?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Products</span>
                    <span className="font-medium">{tenant.max_products?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Storage</span>
                    <span className="font-medium">{tenant.max_storage_gb} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">API Calls/Day</span>
                    <span className="font-medium">{tenant.max_api_calls_per_day?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Users (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Subscription Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tenant.trial_ends_at && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Trial Ends</label>
                    <p className="font-medium">
                      {new Date(tenant.trial_ends_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {tenant.subscription_start_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Started</label>
                    <p className="font-medium">
                      {new Date(tenant.subscription_start_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {tenant.subscription_end_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Ends</label>
                    <p className="font-medium">
                      {new Date(tenant.subscription_end_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
