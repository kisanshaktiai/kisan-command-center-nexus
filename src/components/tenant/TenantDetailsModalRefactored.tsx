
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  X,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { FormattedTenantData } from '@/services/TenantDisplayService';
import { TenantMetrics } from '@/types/tenantView';
import { TenantEmailActions } from './TenantEmailActions';
import { UsageMeter } from './UsageMeter';
import { TrendChart } from './TrendChart';

interface TenantDetailsModalRefactoredProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tenant: Tenant) => void;
  tenant: Tenant | null;
  formattedData: FormattedTenantData | null;
  metrics?: TenantMetrics;
}

export const TenantDetailsModalRefactored: React.FC<TenantDetailsModalRefactoredProps> = ({
  isOpen,
  onClose,
  onEdit,
  tenant,
  formattedData,
  metrics
}) => {
  if (!tenant || !formattedData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-muted-foreground" />
              <div>
                <DialogTitle className="text-xl font-bold">
                  {formattedData.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full bg-green-500`} />
                  <span className="text-sm text-muted-foreground">
                    {formattedData.displayStatus}
                  </span>
                  <Badge variant={formattedData.planBadgeVariant as any}>
                    {formattedData.planDisplayName}
                  </Badge>
                  {metrics && (
                    <div className="flex items-center gap-1 ml-2">
                      <Activity className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">Live</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Basic Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-muted-foreground">Tenant Name</span>
                        <p className="font-medium">{formattedData.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Slug</span>
                        <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {formattedData.slug}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Type</span>
                        <p>{formattedData.displayType}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-muted-foreground">Created</span>
                        <p>{formattedData.formattedCreatedAt}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Last Updated</span>
                        <p>{formattedData.formattedUpdatedAt}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Status</span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span>{formattedData.displayStatus}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Owner Email
                        </span>
                        <p className="font-medium">{formattedData.ownerEmail}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Owner Name
                        </span>
                        <p className="font-medium">{formattedData.ownerName}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone
                        </span>
                        <p className="font-medium">{formattedData.ownerPhone}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Business Address
                        </span>
                        <p className="font-medium text-sm leading-relaxed">
                          {formattedData.formattedBusinessAddress}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Growth Trends - Only if metrics available */}
              {metrics?.growthTrends && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Growth Trends (7 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>

            {/* Right Column - Analytics & Limits */}
            <div className="space-y-6">
              {/* Real-time Usage Metrics */}
              {metrics?.usageMetrics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-green-600" />
                      Live Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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

              {/* Subscription Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Subscription Limits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Max Farmers
                      </span>
                      <span className="font-bold">{formattedData.limitsDisplay.farmers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Max Dealers
                      </span>
                      <span className="font-bold">{formattedData.limitsDisplay.dealers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Storage
                      </span>
                      <span className="font-bold">{formattedData.limitsDisplay.storage}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        API Calls/Day
                      </span>
                      <span className="font-bold">{formattedData.limitsDisplay.apiCalls}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Health Score */}
              {metrics?.healthScore && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Health Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {metrics.healthScore}/100
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Overall tenant health
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Domain Information */}
          {(formattedData.domainInfo.subdomain || formattedData.domainInfo.customDomain) && (
            <>
              <Separator className="my-6" />
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Domain Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formattedData.domainInfo.subdomain && (
                      <div>
                        <span className="text-sm text-muted-foreground">Subdomain</span>
                        <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {formattedData.domainInfo.subdomain}
                        </p>
                      </div>
                    )}
                    {formattedData.domainInfo.customDomain && (
                      <div>
                        <span className="text-sm text-muted-foreground">Custom Domain</span>
                        <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {formattedData.domainInfo.customDomain}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/50">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Last activity: {formattedData.formattedUpdatedAt}
            </span>
            {metrics && (
              <div className="flex items-center gap-1 ml-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600">Live data</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <TenantEmailActions tenant={tenant} />
            <Button variant="outline" onClick={() => onEdit(tenant)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Tenant
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
