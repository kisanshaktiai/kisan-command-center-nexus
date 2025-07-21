
import React from 'react';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Palette, Globe, Settings } from 'lucide-react';

export function TenantBranding() {
  const { tenant, isLoading, getLimitUsage } = useMultiTenant();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Tenant Branding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tenant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Tenant Branding
          </CardTitle>
          <CardDescription>
            No tenant context available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Running in default mode without tenant-specific branding.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          {tenant.branding.app_name}
        </CardTitle>
        <CardDescription>
          Current tenant branding and configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Domain Configuration
          </h4>
          <div className="space-y-1">
            {tenant.subdomain && (
              <Badge variant="outline">
                Subdomain: {tenant.subdomain}
              </Badge>
            )}
            {tenant.custom_domain && (
              <Badge variant="outline">
                Custom Domain: {tenant.custom_domain}
              </Badge>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Brand Colors</h4>
          <div className="flex gap-2">
            <div 
              className="w-8 h-8 rounded border-2 border-gray-200"
              style={{ backgroundColor: tenant.branding.primary_color }}
              title={`Primary: ${tenant.branding.primary_color}`}
            />
            <div 
              className="w-8 h-8 rounded border-2 border-gray-200"
              style={{ backgroundColor: tenant.branding.secondary_color }}
              title={`Secondary: ${tenant.branding.secondary_color}`}
            />
            <div 
              className="w-8 h-8 rounded border-2 border-gray-200"
              style={{ backgroundColor: tenant.branding.accent_color }}
              title={`Accent: ${tenant.branding.accent_color}`}
            />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Resource Limits
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Farmers: {tenant.limits.farmers.toLocaleString()}</div>
            <div>Dealers: {tenant.limits.dealers.toLocaleString()}</div>
            <div>Products: {tenant.limits.products.toLocaleString()}</div>
            <div>Storage: {tenant.limits.storage}GB</div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Enabled Features</h4>
          <div className="flex flex-wrap gap-1">
            {Object.entries(tenant.features).map(([feature, enabled]) => (
              enabled && (
                <Badge key={feature} variant="secondary" className="text-xs">
                  {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              )
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
