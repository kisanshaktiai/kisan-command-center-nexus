
import React from 'react';
import { TenantBillingOverview } from '@/components/billing/TenantBillingOverview';
import { SubscriptionRenewals } from '@/components/billing/SubscriptionRenewals';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Tenant } from '@/types/tenant';

interface TenantBillingTabProps {
  tenant: Tenant;
}

export const TenantBillingTab: React.FC<TenantBillingTabProps> = ({ tenant }) => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <TenantBillingOverview tenantId={tenant.id} />
        </TabsContent>
        
        <TabsContent value="renewals" className="space-y-4">
          <SubscriptionRenewals />
        </TabsContent>
        
        <TabsContent value="usage" className="space-y-4">
          <div className="text-center py-8 text-muted-foreground">
            Usage analytics coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
