
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UpcomingRenewal {
  id: string;
  renewal_date: string;
  amount: number;
  status: string;
}

interface SubscriptionBillingData {
  upcoming_renewals: UpcomingRenewal[];
  billing_summary: {
    total_revenue: number;
    monthly_revenue: number;
    outstanding_amount: number;
  };
}

export function SubscriptionRenewals() {
  const [selectedTenantId] = useState<string>('default-tenant'); // This would come from context in real app

  const { data: billingData, isLoading, error } = useQuery({
    queryKey: ['tenant-subscriptions-billing', selectedTenantId],
    queryFn: async (): Promise<SubscriptionBillingData> => {
      const { data, error } = await supabase.functions.invoke('tenant-subscriptions-billing', {
        method: 'GET',
      });

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilRenewal = (renewalDate: string) => {
    const today = new Date();
    const renewal = new Date(renewalDate);
    const diffTime = renewal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Subscription Renewals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading renewal data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Subscription Renewals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            Error loading renewal data: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  const upcomingRenewals = billingData?.upcoming_renewals || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Upcoming Subscription Renewals
          </CardTitle>
          <CardDescription>
            Monitor and manage upcoming subscription renewals across all tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingRenewals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No upcoming renewals found
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingRenewals.map((renewal) => {
                const daysUntil = getDaysUntilRenewal(renewal.renewal_date);
                const isUrgent = daysUntil <= 7;
                
                return (
                  <div
                    key={renewal.id}
                    className={`p-4 rounded-lg border ${
                      isUrgent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isUrgent ? (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        <div>
                          <div className="font-medium">
                            Renewal Due: {formatDate(renewal.renewal_date)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {daysUntil > 0 ? `${daysUntil} days remaining` : 'Overdue'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-semibold flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {formatCurrency(renewal.amount)}
                          </div>
                          <Badge className={getStatusColor(renewal.status)}>
                            {renewal.status}
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm">
                          Process Renewal
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {billingData?.billing_summary && (
        <Card>
          <CardHeader>
            <CardTitle>Renewal Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(billingData.billing_summary.total_revenue)}
                </div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(billingData.billing_summary.monthly_revenue)}
                </div>
                <div className="text-sm text-gray-600">This Month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(billingData.billing_summary.outstanding_amount)}
                </div>
                <div className="text-sm text-gray-600">Outstanding</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
