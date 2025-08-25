
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Building, 
  Package, 
  HardDrive,
  Activity
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';

interface ResourceMetricsProps {
  tenant: Tenant;
}

const ResourceMetricsContent: React.FC<ResourceMetricsProps> = ({ tenant }) => {
  const metrics = [
    {
      icon: Users,
      color: 'text-blue-500',
      label: 'Farmers',
      current: 0,
      limit: tenant.max_farmers
    },
    {
      icon: Building,
      color: 'text-green-500',
      label: 'Dealers',
      current: 0,
      limit: tenant.max_dealers
    },
    {
      icon: Package,
      color: 'text-purple-500',
      label: 'Products',
      current: 0,
      limit: tenant.max_products
    },
    {
      icon: HardDrive,
      color: 'text-orange-500',
      label: 'Storage',
      current: 0,
      limit: tenant.max_storage_gb,
      unit: 'GB'
    }
  ];

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Resource Limits & Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2">
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
                <span className="text-xs font-medium">{metric.label}</span>
              </div>
              <p className="text-sm">
                {metric.current} / {metric.limit?.toLocaleString() || 'Unlimited'}{metric.unit ? ` ${metric.unit}` : ''}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const ResourceMetrics: React.FC<ResourceMetricsProps> = (props) => {
  return (
    <ErrorBoundary
      context={{
        component: 'ResourceMetrics',
        level: 'low',
        metadata: { tenantId: props.tenant.id }
      }}
    >
      <ResourceMetricsContent {...props} />
    </ErrorBoundary>
  );
};
