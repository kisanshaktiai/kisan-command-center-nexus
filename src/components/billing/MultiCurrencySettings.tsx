import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Globe, RefreshCw, TrendingUp, DollarSign } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBillingRealtime } from '@/hooks/useBillingRealtime';
import { TableRowSkeleton } from '@/components/ui/loading-skeleton';

export function MultiCurrencySettings() {
  const [newRate, setNewRate] = useState<{ base: string; target: string; rate: string }>({
    base: 'USD',
    target: '',
    rate: ''
  });
  const queryClient = useQueryClient();

  const { data: currencyRates, isLoading } = useQuery({
    queryKey: ['currency-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_rates')
        .select('*')
        .order('base_currency')
        .order('target_currency');

      if (error) {
        console.error('Error fetching currency rates:', error);
        throw error;
      }
      return data;
    },
    staleTime: 60000,
    retry: 2,
  });

  // Real-time updates for currency rates
  useBillingRealtime({
    eventType: 'subscription',
    queryKey: ['currency-rates'],
    showNotifications: false
  });

  const { data: taxConfigs } = useQuery({
    queryKey: ['tax-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_configurations')
        .select('*')
        .eq('is_active', true)
        .order('country_code');

      if (error) throw error;
      return data;
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: async (rateData: { base: string; target: string; rate: number }) => {
      const { error } = await supabase
        .from('currency_rates')
        .upsert({
          base_currency: rateData.base,
          target_currency: rateData.target,
          rate: rateData.rate,
          source: 'manual',
          valid_from: new Date().toISOString()
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency-rates'] });
      toast.success('Currency rate updated successfully');
      setNewRate({ base: 'USD', target: '', rate: '' });
    },
    onError: (error: any) => {
      toast.error(`Failed to update rate: ${error.message}`);
    },
  });

  const currencies = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD'];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <TableRowSkeleton />
        <TableRowSkeleton />
        <TableRowSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Currency Rates Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Multi-Currency Support
              </CardTitle>
              <CardDescription>Manage exchange rates and currency conversions</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Rates
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currencies.map((currency) => {
              const rate = currencyRates?.find(r => r.base_currency === 'USD' && r.target_currency === currency);
              return (
                <div key={currency} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{currency}</Badge>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">
                      {rate ? rate.rate.toFixed(4) : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      1 USD = {rate ? rate.rate.toFixed(4) : 'N/A'} {currency}
                    </p>
                    {rate && (
                      <p className="text-xs text-muted-foreground">
                        Updated: {new Date(rate.valid_from).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Manual Rate Update */}
      <Card>
        <CardHeader>
          <CardTitle>Update Exchange Rate</CardTitle>
          <CardDescription>Manually update currency exchange rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Target Currency (e.g., INR)"
                value={newRate.target}
                onChange={(e) => setNewRate({ ...newRate, target: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="flex-1">
              <Input
                type="number"
                step="0.0001"
                placeholder="Exchange Rate"
                value={newRate.rate}
                onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
              />
            </div>
            <Button
              onClick={() => {
                if (newRate.target && newRate.rate) {
                  updateRateMutation.mutate({
                    base: 'USD',
                    target: newRate.target,
                    rate: parseFloat(newRate.rate)
                  });
                }
              }}
              disabled={!newRate.target || !newRate.rate || updateRateMutation.isPending}
            >
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tax Configurations */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Configurations by Region</CardTitle>
          <CardDescription>GST, VAT, and sales tax rates for different regions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {taxConfigs?.map((config) => (
              <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <span className="text-2xl">{getCountryFlag(config.country_code)}</span>
                    {config.country_code} - {config.region === 'ALL' ? 'All Regions' : config.region}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tax Type: {config.tax_type}
                    {config.tax_id_required && ' • Tax ID Required'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{config.tax_rate}%</p>
                  <Badge variant={config.is_active ? 'default' : 'secondary'}>
                    {config.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Currency Conversion Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>Currency Converter</CardTitle>
          <CardDescription>Quick currency conversion tool</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Example Conversions:</p>
            <div className="space-y-2">
              {['INR', 'EUR', 'GBP'].map((curr) => {
                const rate = currencyRates?.find(r => r.base_currency === 'USD' && r.target_currency === curr);
                return rate ? (
                  <div key={curr} className="flex items-center justify-between text-sm">
                    <span>$100 USD</span>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {(100 * rate.rate).toFixed(2)} {curr}
                    </span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getCountryFlag(countryCode: string): string {
  const flags: Record<string, string> = {
    'IN': '🇮🇳',
    'US': '🇺🇸',
    'GB': '🇬🇧',
    'DE': '🇩🇪',
    'FR': '🇫🇷',
    'AU': '🇦🇺',
  };
  return flags[countryCode] || '🌍';
}