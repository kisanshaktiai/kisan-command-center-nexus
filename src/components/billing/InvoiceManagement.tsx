
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Send, Eye, Search, Calendar, DollarSign } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
type PaymentRecordRow = Database['public']['Tables']['payment_records']['Row'];

interface Invoice extends Omit<InvoiceRow, 'line_items' | 'metadata'> {
  line_items: any[];
  metadata: any;
  tenants?: {
    name: string;
  };
}

interface PaymentRecord extends Omit<PaymentRecordRow, 'gateway_response'> {
  gateway_response: any;
}

export function InvoiceManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          tenants(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map(invoice => ({
        ...invoice,
        line_items: Array.isArray(invoice.line_items) ? invoice.line_items : [],
        metadata: typeof invoice.metadata === 'object' ? invoice.metadata : {}
      }));
    }
  });

  const { data: paymentRecords = [] } = useQuery({
    queryKey: ['payment-records'],
    queryFn: async (): Promise<PaymentRecord[]> => {
      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map(record => ({
        ...record,
        gateway_response: typeof record.gateway_response === 'object' ? record.gateway_response : {}
      }));
    }
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      // In a real implementation, this would trigger email sending
      console.log('Sending invoice:', invoiceId);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice sent successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to send invoice: ' + error.message);
    }
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', invoiceId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice marked as paid');
    },
    onError: (error: any) => {
      toast.error('Failed to mark invoice as paid: ' + error.message);
    }
  });

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.tenants?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const invoiceDate = new Date(invoice.created_at);
      const now = new Date();
      
      switch (dateFilter) {
        case 'this_month':
          matchesDate = invoiceDate.getMonth() === now.getMonth() && 
                       invoiceDate.getFullYear() === now.getFullYear();
          break;
        case 'last_month':
          const lastMonth = new Date(now.setMonth(now.getMonth() - 1));
          matchesDate = invoiceDate.getMonth() === lastMonth.getMonth() && 
                       invoiceDate.getFullYear() === lastMonth.getFullYear();
          break;
        case 'overdue':
          matchesDate = new Date(invoice.due_date) < now && invoice.status !== 'paid';
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'sent': return 'bg-blue-500';
      case 'overdue': return 'bg-red-500';
      case 'draft': return 'bg-gray-500';
      case 'cancelled': return 'bg-gray-400';
      default: return 'bg-gray-500';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const calculateMetrics = () => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const totalOverdue = invoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const totalPending = invoices
      .filter(inv => inv.status === 'sent')
      .reduce((sum, inv) => sum + inv.amount, 0);

    return { totalInvoiced, totalPaid, totalOverdue, totalPending };
  };

  const metrics = calculateMetrics();

  if (invoicesLoading) {
    return <div className="text-center py-8">Loading invoices...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Invoice Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalInvoiced)}</div>
            <p className="text-xs text-muted-foreground">{invoices.length} total invoices</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter(i => i.status === 'paid').length} paid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalOverdue)}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter(i => i.status === 'overdue').length} overdue invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalPending)}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter(i => i.status === 'sent').length} pending invoices
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Invoice Management</CardTitle>
              <CardDescription>Track and manage billing invoices</CardDescription>
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
                  placeholder="Search invoices..."
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoices List */}
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">
                      {invoice.invoice_number}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{invoice.tenants?.name || 'Unknown Tenant'}</span>
                      <span>•</span>
                      <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                      {invoice.paid_date && (
                        <>
                          <span>•</span>
                          <span>Paid: {new Date(invoice.paid_date).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.currency}
                    </div>
                  </div>
                  
                  <Badge className={getStatusColor(invoice.status)}>
                    {invoice.status}
                  </Badge>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                    {invoice.status === 'draft' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                        disabled={sendInvoiceMutation.isPending}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                    {invoice.status === 'sent' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => markAsPaidMutation.mutate(invoice.id)}
                        disabled={markAsPaidMutation.isPending}
                      >
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredInvoices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {invoices.length === 0 
                  ? "No invoices found. Invoices will appear here once created."
                  : "No invoices match your current filters."
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
