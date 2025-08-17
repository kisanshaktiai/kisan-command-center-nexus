
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Key, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { PaymentGatewayType, PaymentGatewayCredentials } from '@/types/payment';
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { useTenantContext } from '@/hooks/useTenantContext';

interface PaymentGatewaySelectorProps {
  onConfigurationChange?: (gateway: PaymentGatewayType, isConfigured: boolean) => void;
}

export const PaymentGatewaySelector: React.FC<PaymentGatewaySelectorProps> = ({
  onConfigurationChange
}) => {
  const { tenantId } = useTenantContext();
  const { availableGateways, tenantConfigs, savePaymentConfig, validateGatewayCredentials } = usePaymentGateways();
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType>('stripe');
  const [credentials, setCredentials] = useState<PaymentGatewayCredentials>({});
  const [testMode, setTestMode] = useState(true);

  const getGatewayConfig = (gatewayType: PaymentGatewayType) => {
    return tenantConfigs.find(config => 
      config.tenant_id === tenantId && config.gateway_type === gatewayType
    );
  };

  const handleCredentialChange = (gateway: PaymentGatewayType, field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [gateway]: {
        ...prev[gateway],
        [field]: value
      }
    }));
  };

  const handleSaveConfiguration = async (gatewayType: PaymentGatewayType) => {
    if (!tenantId || !credentials[gatewayType]) return;

    try {
      await savePaymentConfig.mutateAsync({
        tenant_id: tenantId,
        gateway_type: gatewayType,
        api_keys: credentials[gatewayType] || {},
        configuration: { test_mode: testMode },
        is_active: true
      });

      // Validate the credentials
      await validateGatewayCredentials.mutateAsync({
        tenantId,
        gatewayType,
        credentials: credentials[gatewayType] || {}
      });

      onConfigurationChange?.(gatewayType, true);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };

  const renderStripeConfig = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="stripe-publishable">Publishable Key</Label>
        <Input
          id="stripe-publishable"
          placeholder="pk_test_... or pk_live_..."
          value={credentials.stripe?.publishable_key || ''}
          onChange={(e) => handleCredentialChange('stripe', 'publishable_key', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="stripe-secret">Secret Key</Label>
        <Input
          id="stripe-secret"
          type="password"
          placeholder="sk_test_... or sk_live_..."
          value={credentials.stripe?.secret_key || ''}
          onChange={(e) => handleCredentialChange('stripe', 'secret_key', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="stripe-webhook">Webhook Secret (Optional)</Label>
        <Input
          id="stripe-webhook"
          placeholder="whsec_..."
          value={credentials.stripe?.webhook_secret || ''}
          onChange={(e) => handleCredentialChange('stripe', 'webhook_secret', e.target.value)}
        />
      </div>
    </div>
  );

  const renderPayPalConfig = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="paypal-client-id">Client ID</Label>
        <Input
          id="paypal-client-id"
          placeholder="Your PayPal Client ID"
          value={credentials.paypal?.client_id || ''}
          onChange={(e) => handleCredentialChange('paypal', 'client_id', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paypal-secret">Client Secret</Label>
        <Input
          id="paypal-secret"
          type="password"
          placeholder="Your PayPal Client Secret"
          value={credentials.paypal?.client_secret || ''}
          onChange={(e) => handleCredentialChange('paypal', 'client_secret', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paypal-webhook">Webhook ID (Optional)</Label>
        <Input
          id="paypal-webhook"
          placeholder="Your PayPal Webhook ID"
          value={credentials.paypal?.webhook_id || ''}
          onChange={(e) => handleCredentialChange('paypal', 'webhook_id', e.target.value)}
        />
      </div>
    </div>
  );

  const renderRazorpayConfig = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="razorpay-key-id">Key ID</Label>
        <Input
          id="razorpay-key-id"
          placeholder="rzp_test_... or rzp_live_..."
          value={credentials.razorpay?.key_id || ''}
          onChange={(e) => handleCredentialChange('razorpay', 'key_id', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="razorpay-secret">Key Secret</Label>
        <Input
          id="razorpay-secret"
          type="password"
          placeholder="Your Razorpay Key Secret"
          value={credentials.razorpay?.key_secret || ''}
          onChange={(e) => handleCredentialChange('razorpay', 'key_secret', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="razorpay-webhook">Webhook Secret (Optional)</Label>
        <Input
          id="razorpay-webhook"
          placeholder="Your Razorpay Webhook Secret"
          value={credentials.razorpay?.webhook_secret || ''}
          onChange={(e) => handleCredentialChange('razorpay', 'webhook_secret', e.target.value)}
        />
      </div>
    </div>
  );

  const getValidationStatus = (gatewayType: PaymentGatewayType) => {
    const config = getGatewayConfig(gatewayType);
    if (!config) return null;

    switch (config.validation_status) {
      case 'valid':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Valid</Badge>;
      case 'invalid':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Invalid</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Validating</Badge>;
      default:
        return <Badge variant="outline">Not Configured</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Gateway Configuration
        </CardTitle>
        <CardDescription>
          Configure your payment gateways. If no gateway is configured, the system will use Cash Mode for testing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Test Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="test-mode">Test Mode</Label>
              <p className="text-sm text-muted-foreground">Use sandbox/test credentials</p>
            </div>
            <Switch
              id="test-mode"
              checked={testMode}
              onCheckedChange={setTestMode}
            />
          </div>

          {/* Gateway Tabs */}
          <Tabs value={selectedGateway} onValueChange={(value) => setSelectedGateway(value as PaymentGatewayType)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="stripe" className="flex items-center gap-2">
                <span>Stripe</span>
                {getValidationStatus('stripe')}
              </TabsTrigger>
              <TabsTrigger value="paypal" className="flex items-center gap-2">
                <span>PayPal</span>
                {getValidationStatus('paypal')}
              </TabsTrigger>
              <TabsTrigger value="razorpay" className="flex items-center gap-2">
                <span>Razorpay</span>
                {getValidationStatus('razorpay')}
              </TabsTrigger>
              <TabsTrigger value="cash_mode" className="flex items-center gap-2">
                <span>Cash Mode</span>
                <Badge variant="outline">Testing</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stripe" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Stripe Configuration</h3>
                <Button 
                  onClick={() => handleSaveConfiguration('stripe')}
                  disabled={!credentials.stripe?.publishable_key || !credentials.stripe?.secret_key}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Save & Validate
                </Button>
              </div>
              {renderStripeConfig()}
            </TabsContent>

            <TabsContent value="paypal" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">PayPal Configuration</h3>
                <Button 
                  onClick={() => handleSaveConfiguration('paypal')}
                  disabled={!credentials.paypal?.client_id || !credentials.paypal?.client_secret}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Save & Validate
                </Button>
              </div>
              {renderPayPalConfig()}
            </TabsContent>

            <TabsContent value="razorpay" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Razorpay Configuration</h3>
                <Button 
                  onClick={() => handleSaveConfiguration('razorpay')}
                  disabled={!credentials.razorpay?.key_id || !credentials.razorpay?.key_secret}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Save & Validate
                </Button>
              </div>
              {renderRazorpayConfig()}
            </TabsContent>

            <TabsContent value="cash_mode" className="space-y-4">
              <div className="text-center py-8">
                <CreditCard className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Cash Mode (Testing)</h3>
                <p className="text-muted-foreground">
                  Cash mode is automatically enabled when no payment gateways are configured.
                  This is perfect for testing and development purposes.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Gateway Summary */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Configured Gateways</h4>
            <div className="grid gap-3">
              {availableGateways.map(gateway => {
                const config = getGatewayConfig(gateway.gateway_type);
                return (
                  <div key={gateway.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h5 className="font-medium">{gateway.display_name}</h5>
                      <p className="text-sm text-muted-foreground">{gateway.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getValidationStatus(gateway.gateway_type)}
                      <span className="text-sm text-muted-foreground">
                        {gateway.supported_currencies.join(', ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
