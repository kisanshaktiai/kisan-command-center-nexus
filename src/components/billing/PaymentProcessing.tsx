
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, AlertCircle, CheckCircle, Clock, RefreshCw, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Payment {
  id: string;
  tenant_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'disputed';
  gateway_name: string;
  gateway_payment_id: string | null;
  failure_code: string | null;
  failure_message: string | null;
  paid_at: string | null;
  refunded_amount: number;
  created_at: string;
  tenants?: {
    name: string;
  };
  invoices?: {
    invoice_number: string;
  };
}

interface PaymentMethod {
  id: string;
  tenant_id: string;
  type: 'card' | 'bank_transfer' | 'upi' | 'wallet' | 'net_banking';
  is_default: boolean;
  last_four: string | null;
  card_brand: string | null;
  expiry_month: number | null;
  expiry_year: number | null;
  is_active: boolean;
  created_at: string;
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
          tenants(name),
          invoices(invoice_number)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as Payment[];
    }
  });

  // Fetch payment methods
  const { data: paymentMethods = [], isLoading: methodsLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select(`
          *,
          tenants(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PaymentMethod[];
    }
  });

  // Fetch failed payments
  const { data: failedPayments = [] } = useQuery({
    queryKey: ['failed-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_attempts')
        .select(`
          *,
          tenants(name),
          invoices(invoice_number)
        `)
        .eq('status', 'failed')
        .order('attempted_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  // Retry payment mutation
  const retryPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      // This would integrate with actual payment gateway
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
      // This would integrate with actual payment gateway
      const { data, error } = await supabase
        .from('payments')
        .update({ 
          status: 'refunded',
          refunded_amount: amount
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
                         payment.invoices?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesGateway = gatewayFilter === 'all' || payment.gateway_name === gatewayFilter;
    
    return matchesSearch && matchesStatus && matchesGateway;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'refunded': return <RefreshCw className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      case 'refunded': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'card': return <CreditCard className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="failed">Failed Payments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Transactions</CardTitle>
              <CardDescription>Monitor and manage payment processing</CardDescription>
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
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={gatewayFilter} onValueChange={setGatewayFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Gateways</SelectItem>
                    <SelectItem value="razorpay">Razorpay</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
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
                          {payment.tenants?.name || 'Unknown Tenant'}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Invoice: {payment.invoices?.invoice_number || 'N/A'}</span>
                          <span>•</span>
                          <span>{payment.gateway_name}</span>
                          {payment.failure_message && (
                            <>
                              <span>•</span>
                              <span className="text-red-500">{payment.failure_message}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">
                          {payment.currency === 'INR' ? '₹' : '$'}{payment.amount.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString()}
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
                            Retry
                          </Button>
                        )}
                        {payment.status === 'completed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => refundPaymentMutation.mutate({ 
                              paymentId: payment.id, 
                              amount: payment.amount 
                            })}
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
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Manage tenant payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {getPaymentMethodIcon(method.type)}
                      <div>
                        <h4 className="font-medium">{method.tenants?.name || 'Unknown Tenant'}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{method.type.replace('_', ' ').toUpperCase()}</span>
                          {method.last_four && (
                            <>
                              <span>•</span>
                              <span>****{method.last_four}</span>
                            </>
                          )}
                          {method.card_brand && (
                            <>
                              <span>•</span>
                              <span>{method.card_brand}</span>
                            </>
                          )}
                          {method.expiry_month && method.expiry_year && (
                            <>
                              <span>•</span>
                              <span>Expires {method.expiry_month}/{method.expiry_year}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {method.is_default && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      <Badge variant={method.is_active ? 'default' : 'secondary'}>
                        {method.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Failed Payments & Dunning</CardTitle>
              <CardDescription>Review and retry failed payment attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {failedPayments.map((attempt: any) => (
                  <div key={attempt.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                    <div className="flex items-center gap-4">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <div>
                        <h4 className="font-medium">{attempt.tenants?.name || 'Unknown Tenant'}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Attempt #{attempt.attempt_number}</span>
                          <span>•</span>
                          <span>Invoice: {attempt.invoices?.invoice_number || 'N/A'}</span>
                          <span>•</span>
                          <span className="text-red-500">{attempt.error_message}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">₹{attempt.amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(attempt.attempted_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        Retry Payment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Payment Analytics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94.2%</div>
                <p className="text-xs text-muted-foreground">+2.1% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Processing Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.3s</div>
                <p className="text-xs text-muted-foreground">-0.2s from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Refund Rate</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.8%</div>
                <p className="text-xs text-muted-foreground">-0.3% from last month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
