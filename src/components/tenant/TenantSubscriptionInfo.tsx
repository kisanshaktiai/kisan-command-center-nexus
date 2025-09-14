
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';

interface TenantSubscriptionInfoProps {
  tenant: Tenant;
}

const TenantSubscriptionInfoContent: React.FC<TenantSubscriptionInfoProps> = ({ tenant }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Subscription Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500">Plan</p>
          <p className="text-sm font-medium">{tenant.subscription_plan.replace('_', ' ')}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500">Start Date</p>
            <p className="text-sm">{formatDate(tenant.subscription_start_date)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">End Date</p>
            <p className="text-sm">{formatDate(tenant.subscription_end_date)}</p>
          </div>
        </div>
        {tenant.trial_ends_at && (
          <div>
            <p className="text-xs font-medium text-gray-500">Trial Ends</p>
            <p className="text-sm">{formatDate(tenant.trial_ends_at)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const TenantSubscriptionInfo: React.FC<TenantSubscriptionInfoProps> = (props) => {
  return (
    <ErrorBoundary
      context={{
        component: 'TenantSubscriptionInfo',
        level: 'low',
        metadata: { tenantId: props.tenant.id }
      }}
    >
      <TenantSubscriptionInfoContent {...props} />
    </ErrorBoundary>
  );
};
