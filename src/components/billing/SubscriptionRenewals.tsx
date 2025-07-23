
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, RefreshCw, AlertCircle, CheckCircle, Search, Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type SubscriptionRenewalRow = Database['public']['Tables']['subscription_renewals']['Row'];

interface SubscriptionRenewal extends SubscriptionRenewalRow {
  tenants?: {
    name: string;
  };
  tenant_subscriptions?: {
    billing_plans?: {
      name: string;
    } | null;
  } | null;
}

export function SubscriptionRenewals() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: renewals = [], isLoading } = useQuery({
    queryKey: ['subscription-renewals'],
    queryFn: async (): Promise<SubscriptionRenewal[]> => {
      const { data, error } = await supabase
        .from('subscription_renewals')
        .select(`
          *,
          tenants(name),
          tenant_subscriptions(
            billing_plans(name)
          )
        `)
        .order('renewal_date', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  const processRenewalMutation = useMutation({
    mutationFn: async (renewalId: string) => {
      // This would integrate with Stripe to process the renewal
      const { error } = await supabase
        .from('subscription_renewals')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString()
        })
        .eq('id', renewalId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-renewals'] });
      toast.success('Renewal processed successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to process renewal: ' + error.message);
    }
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async (renewalId: string) => {
      // This would send a notification to the tenant
      const { error } = await supabase
        .from('subscription_renewals')
        .update({ notification_sent: true })
        .eq('id', renewalId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-renewals'] });
      toast.success('Notification sent successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to send notification: ' + error.message);
    }
  });

  const filteredRenewals = renewals.filter(renewal => {
    const matchesSearch = renewal.tenants?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || renewal.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const renewalDate = new Date(renewal.renewal_date);
      const now = new Date();
      
      switch (dateFilter) {
        case 'upcoming':
          const nextWeek = new Date();
          nextWeek.setDate(now.getDate() + 7);
          matchesDate = renewalDate >= now && renewalDate <= nextWeek;
          break;
        case 'overdue':
          matchesDate = renewalDate < now && renewal.status === 'pending';
          break;
        case 'this_month':
          matchesDate = renewalDate.getMonth() === now.getMonth() && 
                       renewalDate.getFullYear() === now.getFullYear();
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const isUpcoming = (date: string) => {
    const renewalDate = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  const isOverdue = (date: string, status: string) => {
    return new Date(date) < new Date() && status === 'pending';
  };

  const calculateMetrics = () => {
    const upcomingRenewals = renewals.filter(r => isUpcoming(r.renewal_date));
    const overdueRenewals = renewals.filter(r => isOverdue(r.renewal_date, r.status));
    const totalRevenue = renewals
      .filter(r => r.status === 'processed')
      .reduce((sum, r) => sum + r.amount, 0);
    const pendingRevenue = renewals
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);

    return { upcomingRenewals, overdueRenewals, totalRevenue, pendingRevenue };
  };

  const metrics = calculateMetrics();

  if (isLoading) {
    return <div className="text-center py-8">Loading renewals...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Renewal Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Renewals</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.upcomingRenewals.length}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Renewals</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.overdueRenewals.length}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed Revenue</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.pendingRevenue)}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Subscription Renewals</CardTitle>
              <CardDescription>Monitor and manage subscription renewals</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search renewals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="upcoming">Upcoming (7 days)</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Renewals List */}
          <div className="space-y-4">
            {filteredRenewals.map((renewal) => {
              const upcoming = isUpcoming(renewal.renewal_date);
              const overdue = isOverdue(renewal.renewal_date, renewal.status);
              
              return (
                <div 
                  key={renewal.id} 
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    overdue ? 'border-red-200 bg-red-50' : 
                    upcoming ? 'border-yellow-200 bg-yellow-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      {(upcoming || overdue) && (
                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                          overdue ? 'bg-red-500' : 'bg-yellow-500'
                        }`} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {renewal.tenants?.name || 'Unknown Tenant'}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Plan: {renewal.tenant_subscriptions?.billing_plans?.name || 'Unknown'}</span>
                        <span>•</span>
                        <span>Renewal: {new Date(renewal.renewal_date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Auto-renew: {renewal.auto_renew ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(renewal.amount, renewal.currency)}
                      </div>
                      {renewal.processed_at && (
                        <div className="text-xs text-muted-foreground">
                          Processed: {new Date(renewal.processed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <Badge className={getStatusColor(renewal.status)}>
                      {renewal.status}
                    </Badge>
                    
                    <div className="flex gap-2">
                      {renewal.status === 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => processRenewalMutation.mutate(renewal.id)}
                          disabled={processRenewalMutation.isPending}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                      {!renewal.notification_sent && renewal.status === 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => sendNotificationMutation.mutate(renewal.id)}
                          disabled={sendNotificationMutation.isPending}
                        >
                          <Bell className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredRenewals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {renewals.length === 0 
                  ? "No renewals found. Renewals will appear here once subscriptions are active."
                  : "No renewals match your current filters."
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
