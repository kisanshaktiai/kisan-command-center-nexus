import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink } from 'lucide-react';
import { usePayouts, useProcessPayout } from '@/hooks/useBillingCore';
import { format } from 'date-fns';
import { currencyService } from '@/services/billing/CurrencyService';
import type { PayoutStatus } from '@/types/billing/unified';

interface PayoutListProps {
  tenantId?: string;
  showProcessButton?: boolean;
}

const statusColors: Record<PayoutStatus, string> = {
  pending: 'bg-yellow-500',
  processing: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-500',
};

export function PayoutList({ tenantId, showProcessButton = false }: PayoutListProps) {
  const { data: payouts, isLoading, error } = usePayouts(tenantId);
  const processPayout = useProcessPayout();

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
        Error loading payouts
      </div>
    );
  }

  if (!payouts || payouts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No payouts found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {payouts.map((payout: any) => (
        <Card key={payout.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {currencyService.formatCurrency(payout.amount, payout.currency)}
              </CardTitle>
              <Badge className={statusColors[payout.status as PayoutStatus]}>
                {payout.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {payout.tenant && (
                <>
                  <div className="text-muted-foreground">Tenant:</div>
                  <div className="font-medium">{payout.tenant.name}</div>
                </>
              )}

              {payout.commission_rate && (
                <>
                  <div className="text-muted-foreground">Commission Rate:</div>
                  <div className="font-medium">{payout.commission_rate}%</div>
                </>
              )}

              {payout.payout_method && (
                <>
                  <div className="text-muted-foreground">Method:</div>
                  <div className="font-medium capitalize">{payout.payout_method}</div>
                </>
              )}

              {payout.transfer_ref && (
                <>
                  <div className="text-muted-foreground">Transfer Ref:</div>
                  <div className="font-mono text-xs">{payout.transfer_ref}</div>
                </>
              )}

              {payout.transaction && (
                <>
                  <div className="text-muted-foreground">Transaction:</div>
                  <div className="font-medium">
                    {currencyService.formatCurrency(payout.transaction.amount, payout.currency)}
                  </div>
                </>
              )}

              {payout.processed_at && (
                <>
                  <div className="text-muted-foreground">Processed:</div>
                  <div>{format(new Date(payout.processed_at), 'MMM dd, yyyy HH:mm')}</div>
                </>
              )}

              {payout.failure_reason && (
                <>
                  <div className="text-muted-foreground text-red-500">Failure:</div>
                  <div className="text-red-500">{payout.failure_reason}</div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div className="text-xs text-muted-foreground">
                Created: {format(new Date(payout.created_at), 'MMM dd, yyyy HH:mm')}
              </div>
              
              {showProcessButton && payout.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => processPayout.mutate(payout.id)}
                  disabled={processPayout.isPending}
                >
                  {processPayout.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Process Payout
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
