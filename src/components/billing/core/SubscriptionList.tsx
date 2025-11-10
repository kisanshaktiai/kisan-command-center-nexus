import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, CreditCard, User } from 'lucide-react';
import { useSubscriptions } from '@/hooks/useBillingCore';
import { format } from 'date-fns';
import { currencyService } from '@/services/billing/CurrencyService';
import type { SubscriptionStatus } from '@/types/billing/unified';

interface SubscriptionListProps {
  farmerId?: string;
  tenantId?: string;
}

const statusColors: Record<SubscriptionStatus, string> = {
  pending: 'bg-yellow-500',
  active: 'bg-green-500',
  expired: 'bg-gray-500',
  cancelled: 'bg-red-500',
  suspended: 'bg-orange-500',
};

export function SubscriptionList({ farmerId, tenantId }: SubscriptionListProps) {
  const { data: subscriptions, isLoading, error } = useSubscriptions({ farmerId, tenantId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading subscriptions
      </div>
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No subscriptions found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {subscriptions.map((subscription: any) => (
        <Card key={subscription.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {subscription.plan?.title || 'Unknown Plan'}
              </CardTitle>
              <Badge 
                className={statusColors[subscription.status as SubscriptionStatus]}
              >
                {subscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">
                  {currencyService.formatCurrency(subscription.amount, subscription.currency)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">
                  {subscription.plan?.duration_days || 0} days
                </span>
              </div>

              {subscription.farmer && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Farmer:</span>
                  <span className="font-medium">{subscription.farmer.farmer_name}</span>
                </div>
              )}

              {subscription.tenant && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tenant:</span>
                  <span className="font-medium">{subscription.tenant.name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
              {subscription.start_date && (
                <div>
                  Start: {format(new Date(subscription.start_date), 'MMM dd, yyyy')}
                </div>
              )}
              {subscription.end_date && (
                <div>
                  End: {format(new Date(subscription.end_date), 'MMM dd, yyyy')}
                </div>
              )}
              <div className="ml-auto">
                Gateway: <span className="uppercase">{subscription.payment_gateway}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
