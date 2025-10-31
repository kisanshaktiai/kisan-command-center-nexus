import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, RefreshCw, CreditCard } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WalletTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export function WalletManagement() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [topupAmount, setTopupAmount] = useState<string>('');
  const [topupCurrency, setTopupCurrency] = useState<string>('USD');
  const queryClient = useQueryClient();

  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ['tenant-wallets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_wallets')
        .select('*, tenants(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ['wallet-transactions', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return [];
      
      const wallet = wallets?.find(w => w.tenant_id === selectedTenantId);
      if (!wallet) return [];

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as WalletTransaction[];
    },
    enabled: !!selectedTenantId,
  });

  const topupMutation = useMutation({
    mutationFn: async ({ tenantId, amount, currency }: { tenantId: string; amount: number; currency: string }) => {
      const wallet = wallets?.find(w => w.tenant_id === tenantId);
      if (!wallet) throw new Error('Wallet not found');

      // Update wallet balance
      const newBalance = Number(wallet.balance) + amount;
      const { error: walletError } = await supabase
        .from('tenant_wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id);

      if (walletError) throw walletError;

      // Record transaction
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          transaction_type: 'topup',
          amount: amount,
          balance_before: wallet.balance,
          balance_after: newBalance,
          description: `Manual top-up of ${currency} ${amount}`,
          metadata: { currency, manual: true }
        });

      if (txError) throw txError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      toast.success('Wallet topped up successfully');
      setTopupAmount('');
    },
    onError: (error: any) => {
      toast.error(`Failed to top up wallet: ${error.message}`);
    },
  });

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'topup': return <ArrowDownRight className="h-4 w-4 text-success" />;
      case 'deduct': return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case 'refund': return <RefreshCw className="h-4 w-4 text-primary" />;
      default: return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (walletsLoading) {
    return <div className="text-center py-8">Loading wallets...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Tenant Wallets & Credits
              </CardTitle>
              <CardDescription>Manage tenant credit balances and top-ups</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Credits
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Top Up Wallet</DialogTitle>
                  <DialogDescription>Add credits to a tenant's wallet</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Tenant</Label>
                    <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        {wallets?.map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.tenant_id}>
                            {(wallet.tenants as any)?.name || wallet.tenant_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={topupCurrency} onValueChange={setTopupCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="INR">INR</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (selectedTenantId && topupAmount) {
                        topupMutation.mutate({
                          tenantId: selectedTenantId,
                          amount: parseFloat(topupAmount),
                          currency: topupCurrency
                        });
                      }
                    }}
                    disabled={!selectedTenantId || !topupAmount || topupMutation.isPending}
                  >
                    {topupMutation.isPending ? 'Processing...' : 'Top Up'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {wallets?.map((wallet) => (
              <div key={wallet.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{(wallet.tenants as any)?.name || 'Unknown Tenant'}</p>
                    <p className="text-sm text-muted-foreground">
                      Auto top-up: {wallet.auto_topup_enabled ? '✅ Enabled' : '❌ Disabled'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatCurrency(wallet.balance, wallet.currency)}</p>
                  <Badge variant={Number(wallet.balance) > 100 ? 'default' : 'destructive'}>
                    {wallet.currency}
                  </Badge>
                </div>
              </div>
            ))}

            {(!wallets || wallets.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No wallets found. Wallets will be created automatically for tenants.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      {selectedTenantId && transactions && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Recent wallet transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(tx.transaction_type)}
                    <div>
                      <p className="font-medium capitalize">{tx.transaction_type}</p>
                      <p className="text-xs text-muted-foreground">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.transaction_type === 'topup' || tx.transaction_type === 'refund' ? 'text-success' : 'text-destructive'}`}>
                      {tx.transaction_type === 'deduct' ? '-' : '+'}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Balance: {formatCurrency(tx.balance_after)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}