
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, AlertCircle, CheckCircle, Clock, RefreshCw, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Payment {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  transaction_id: string | null;
  gateway_response: Record<string, any>;
  created_at: string;
  updated_at: string;
  tenants?: {
    name: string;
  };
}

export function PaymentProcessing() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  // Fetch payments
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          tenants(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return (data || []) as Payment[];
    }
  });

  // Retry payment mutation
  const retryPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { data, error } = await supabase
        .from('payments')
        .update({ status: 'pending' })
        .eq('id', paymentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment retry initiated');
    },
    onError: (error: any) => {
      toast.error('Failed to retry payment: ' + error.message);
    }
  });

  // Refund payment mutation
  const refundPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, amount }: { paymentId: string; amount: number }) => {
      const { data, error } = await supabase
        .from('payments')
        .update({ 
          status: 'failed',
          gateway_response: { refund_amount: amount }
        })
        .eq('id', paymentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Refund processed successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to process refund: ' + error.message);
    }
  });

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.tenants?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesGateway = gatewayFilter === 'all' || payment.payment_method === gatewayFilter;
    
    return matchesSearch && matchesStatus && matchesGateway;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled': return <RefreshCw className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (paymentsLoading) {
    return <div className="text-center py-8">Loading payments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Payment Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Payments</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.filter(p => p.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              ${payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0).toLocaleString()} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.filter(p => p.status === 'failed').length}
            </div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.length > 0 ? 
                ((payments.filter(p => p.status === 'completed').length / payments.length) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Payment success rate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Processing</CardTitle>
          <CardDescription>Monitor and manage payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search payments..."
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
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={gatewayFilter} onValueChange={setGatewayFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payments List */}
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  {getStatusIcon(payment.status)}
                  <div>
                    <h4 className="font-medium">
                      {payment.transaction_id || payment.id.slice(0, 8)}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{payment.tenants?.name || 'Unknown Tenant'}</span>
                      <span>•</span>
                      <span>Method: {payment.payment_method || 'Unknown'}</span>
                      <span>•</span>
                      <span>{new Date(payment.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">
                      {payment.currency === 'USD' ? '$' : '₹'}{payment.amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {payment.currency}
                    </div>
                  </div>
                  
                  <Badge className={getStatusColor(payment.status)}>
                    {payment.status}
                  </Badge>
                  
                  <div className="flex gap-2">
                    {payment.status === 'failed' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => retryPaymentMutation.mutate(payment.id)}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    {payment.status === 'completed' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => refundPaymentMutation.mutate({ paymentId: payment.id, amount: payment.amount })}
                      >
                        Refund
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
