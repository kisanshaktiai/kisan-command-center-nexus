
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign, CreditCard, AlertCircle, Users } from 'lucide-react';
import { useTenantBilling } from '@/hooks/billing/useTenantBilling';
import { useTenantUsage } from '@/hooks/billing/useTenantUsage';

interface TenantBillingOverviewProps {
  tenantId: string;
}

export const TenantBillingOverview: React.FC<TenantBillingOverviewProps> = ({ tenantId }) => {
  const { data: billingData, isLoading: billingLoading } = useTenantBilling(tenantId);
  const { data: usageData, isLoading: usageLoading } = useTenantUsage(tenantId);

  if (billingLoading || usageLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activeSubscription = billingData?.active_subscriptions?.[0];
  const bilingSummary = billingData?.billing_summary;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeSubscription?.billing_plan?.name || 'No Plan'}
            </div>
            <Badge variant={activeSubscription?.status === 'active' ? 'default' : 'secondary'}>
              {activeSubscription?.status || 'inactive'}
            </Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${bilingSummary?.monthly_revenue?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${bilingSummary?.total_revenue?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${bilingSummary?.outstanding_amount?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Unpaid invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Limits */}
      {usageData && (
        <Card>
          <CardHeader>
            <CardTitle>Resource Usage</CardTitle>
            <CardDescription>Current usage against plan limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(usageData.usage_summary).map(([key, usage]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{key.replace('_', ' ')}</span>
                  <span className="text-muted-foreground">
                    {usage.current} / {usage.limit}
                  </span>
                </div>
                <Progress value={usage.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {billingData?.payment_records?.slice(0, 5).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">${payment.amount}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                    {payment.status}
                  </Badge>
                </div>
              )) || <p className="text-muted-foreground">No payments yet</p>}
            </div>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {billingData?.invoices?.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(invoice.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${invoice.amount}</p>
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              )) || <p className="text-muted-foreground">No invoices yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
