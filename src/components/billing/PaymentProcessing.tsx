
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, AlertCircle, CheckCircle, Clock, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async (): Promise<Payment[]> => {
      // Mock data for payments since the table was just created
      const mockPayments = [
        {
          id: '1',
          tenant_id: 'tenant-1',
          subscription_id: 'sub-1',
          amount: 2999,
          currency: 'INR',
          status: 'completed',
          payment_method: 'credit_card',
          transaction_id: 'txn_123',
          gateway_response: {},
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          tenants: { name: 'Sample Company' }
        },
        {
          id: '2',
          tenant_id: 'tenant-2',
          subscription_id: 'sub-2',
          amount: 5999,
          currency: 'INR',
          status: 'pending',
          payment_method: 'bank_transfer',
          transaction_id: 'txn_456',
          gateway_response: {},
          created_at: '2024-01-14T15:30:00Z',
          updated_at: '2024-01-14T15:30:00Z',
          tenants: { name: 'Another Company' }
        }
      ];
      return mockPayments;
    },
    refetchInterval: 30000, // Real-time updates every 30 seconds
  });

  const retryPayment = async (paymentId: string) => {
    try {
      // Mock payment retry since this is a demo
      console.log('Retrying payment:', paymentId);
      toast.success('Payment retry initiated');
    } catch (error) {
      toast.error('Failed to retry payment');
    }
  };

  const refundPayment = async (paymentId: string, amount: number) => {
    try {
      // Mock refund processing since this is a demo
      console.log('Processing refund for payment:', paymentId, 'amount:', amount);
      toast.success('Refund processed successfully');
    } catch (error) {
      toast.error('Failed to process refund');
    }
  };

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = payment.tenants?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesGateway = gatewayFilter === 'all' || payment.payment_method === gatewayFilter;
    
    return matchesSearch && matchesStatus && matchesGateway;
  }) || [];

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

  const completedPayments = payments?.filter(p => p.status === 'completed') || [];
  const failedPayments = payments?.filter(p => p.status === 'failed') || [];
  const totalSuccessAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const successRate = payments && payments.length > 0 ? 
    (completedPayments.length / payments.length) * 100 : 0;

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
            <div className="text-2xl font-bold">{payments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Payments</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              ₹{totalSuccessAmount.toLocaleString()} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedPayments.length}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
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
                      ₹{payment.amount.toLocaleString()}
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
                        onClick={() => retryPayment(payment.id)}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    {payment.status === 'completed' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => refundPayment(payment.id, payment.amount)}
                      >
                        Refund
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredPayments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {payments?.length === 0 
                  ? "No payments found. Payments will appear here once transactions are processed."
                  : "No payments match your current filters."
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
