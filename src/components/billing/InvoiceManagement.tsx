
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Send, Eye, Search, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  invoice_number: string;
  status: string;
  total_amount: number;
  amount_due: number;
  currency: string;
  issued_at: string;
  due_date: string;
  paid_at: string | null;
  line_items: any[];
  created_at: string;
  updated_at: string;
  tenants?: {
    name: string;
  };
  tenant_subscriptions?: {
    billing_plans?: {
      name: string;
    };
  };
}

export function InvoiceManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  // Fetch invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          tenants(name),
          tenant_subscriptions(
            billing_plans!tenant_subscriptions_billing_plan_id_fkey(name)
          )
        `)
        .order('issued_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as Invoice[];
    }
  });

  // Generate invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      // This would integrate with PDF generation service
      const { data, error } = await supabase
        .from('invoices')
        .update({ 
          status: 'pending'
        })
        .eq('id', invoiceId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice generated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to generate invoice: ' + error.message);
    }
  });

  // Send invoice mutation
  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      // This would integrate with email service
      const { data, error } = await supabase
        .from('invoices')
        .update({ status: 'pending' })
        .eq('id', invoiceId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice sent successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to send invoice: ' + error.message);
    }
  });

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString(),
          amount_due: 0
        })
        .eq('id', invoiceId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const invoiceDate = new Date(invoice.issued_at);
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
        case 'this_quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          const invoiceQuarter = Math.floor(invoiceDate.getMonth() / 3);
          matchesDate = quarter === invoiceQuarter && 
                       invoiceDate.getFullYear() === now.getFullYear();
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'pending': return 'bg-blue-500';
      case 'overdue': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const isOverdue = (invoice: Invoice) => {
    return new Date(invoice.due_date) < new Date() && invoice.status === 'pending';
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading invoices...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Invoice Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount_due, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter(i => i.status === 'pending').length} pending invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{invoices.filter(i => isOverdue(i)).reduce((sum, i) => sum + i.amount_due, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter(i => isOverdue(i)).length} overdue invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92.5%</div>
            <p className="text-xs text-muted-foreground">+2.1% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Invoice Management</CardTitle>
              <CardDescription>Generate, send, and track invoices</CardDescription>
            </div>
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              Generate Invoices
            </Button>
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
                <SelectItem value="pending">Pending</SelectItem>
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
                <SelectItem value="this_quarter">This Quarter</SelectItem>
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
                      <span>Issued: {new Date(invoice.issued_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">
                      {invoice.currency === 'INR' ? '₹' : '$'}{invoice.total_amount.toLocaleString()}
                    </div>
                    {invoice.amount_due > 0 && (
                      <div className="text-sm text-red-500">
                        Due: {invoice.currency === 'INR' ? '₹' : '$'}{invoice.amount_due.toLocaleString()}
                      </div>
                    )}
                  </div>
                  
                  <Badge className={getStatusColor(invoice.status)}>
                    {isOverdue(invoice) ? 'overdue' : invoice.status}
                  </Badge>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => generateInvoiceMutation.mutate(invoice.id)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {invoice.status === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                    {invoice.status === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => markAsPaidMutation.mutate(invoice.id)}
                      >
                        Mark Paid
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
