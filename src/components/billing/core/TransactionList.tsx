import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useTransactions } from '@/hooks/useBillingCore';
import { format } from 'date-fns';
import { currencyService } from '@/services/billing/CurrencyService';
import type { TransactionStatus } from '@/types/billing/unified';

interface TransactionListProps {
  tenantId?: string;
  farmerId?: string;
  limit?: number;
}

const statusColors: Record<TransactionStatus, string> = {
  pending: 'bg-yellow-500',
  processing: 'bg-blue-500',
  success: 'bg-green-500',
  failed: 'bg-red-500',
  refunded: 'bg-purple-500',
};

export function TransactionList({ tenantId, farmerId, limit }: TransactionListProps) {
  const { data: transactions, isLoading, error } = useTransactions({ tenantId, farmerId });

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
        Error loading transactions
      </div>
    );
  }

  const displayTransactions = limit ? transactions?.slice(0, limit) : transactions;

  if (!displayTransactions || displayTransactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No transactions found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {displayTransactions.map((transaction: any) => (
        <Card key={transaction.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {currencyService.formatCurrency(transaction.amount, transaction.currency)}
              </CardTitle>
              <div className="flex items-center gap-2">
                {transaction.virtual_mode && (
                  <Badge variant="outline">Test Mode</Badge>
                )}
                <Badge className={statusColors[transaction.status as TransactionStatus]}>
                  {transaction.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground">Gateway:</div>
              <div className="font-medium uppercase">{transaction.gateway}</div>

              <div className="text-muted-foreground">Payment Mode:</div>
              <div className="font-medium capitalize">{transaction.payment_mode}</div>

              {transaction.gateway_txn_id && (
                <>
                  <div className="text-muted-foreground">Transaction ID:</div>
                  <div className="font-mono text-xs">{transaction.gateway_txn_id}</div>
                </>
              )}

              {transaction.farmer && (
                <>
                  <div className="text-muted-foreground">Farmer:</div>
                  <div>{transaction.farmer.farmer_name || transaction.farmer.mobile_number}</div>
                </>
              )}

              {transaction.tenant && (
                <>
                  <div className="text-muted-foreground">Tenant:</div>
                  <div>{transaction.tenant.name}</div>
                </>
              )}

              {transaction.failure_reason && (
                <>
                  <div className="text-muted-foreground text-red-500">Failure Reason:</div>
                  <div className="text-red-500">{transaction.failure_reason}</div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
              <div>{format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}</div>
              <div>ID: {transaction.id.slice(0, 8)}...</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
