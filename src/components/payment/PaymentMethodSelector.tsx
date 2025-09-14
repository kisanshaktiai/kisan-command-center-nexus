
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CreditCard, Wallet, Banknote, Loader2 } from 'lucide-react';
import { PaymentGatewayType } from '@/types/payment';
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { useTenantContext } from '@/hooks/useTenantContext';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface PaymentMethodSelectorProps {
  amount: number;
  currency: string;
  description?: string;
  onPaymentSuccess?: (transactionId: string) => void;
  onPaymentError?: (error: string) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  amount,
  currency,
  description,
  onPaymentSuccess,
  onPaymentError
}) => {
  const { tenantId } = useTenantContext();
  const { tenantConfigs } = usePaymentGateways();
  const { showSuccess, showError } = useNotifications();
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType>('cash_mode');
  const [isProcessing, setIsProcessing] = useState(false);

  const availableGateways = tenantConfigs
    .filter(config => config.tenant_id === tenantId && config.is_active && config.validation_status === 'valid')
    .map(config => config.gateway_type);

  // Add cash mode if no gateways are configured
  if (availableGateways.length === 0) {
    availableGateways.push('cash_mode');
  }

  const getGatewayIcon = (gateway: PaymentGatewayType) => {
    switch (gateway) {
      case 'stripe':
        return <CreditCard className="w-5 h-5" />;
      case 'paypal':
        return <Wallet className="w-5 h-5" />;
      case 'razorpay':
        return <CreditCard className="w-5 h-5" />;
      case 'cash_mode':
        return <Banknote className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getGatewayDisplayName = (gateway: PaymentGatewayType) => {
    switch (gateway) {
      case 'stripe':
        return 'Stripe';
      case 'paypal':
        return 'PayPal';
      case 'razorpay':
        return 'Razorpay';
      case 'cash_mode':
        return 'Cash Mode (Testing)';
      default:
        return gateway;
    }
  };

  const handlePayment = async () => {
    if (!tenantId) {
      showError('No tenant selected');
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: {
          tenant_id: tenantId,
          amount,
          currency,
          description,
          gateway_type: selectedGateway,
          return_url: `${window.location.origin}/payment-success`,
          cancel_url: `${window.location.origin}/payment-cancelled`,
          metadata: {
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        if (data.payment_url) {
          // Redirect to payment gateway
          window.open(data.payment_url, '_blank');
        } else {
          // Payment completed (cash mode)
          showSuccess('Payment processed successfully');
          onPaymentSuccess?.(data.transaction_id);
        }
      } else {
        throw new Error(data.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error.message || 'Payment processing failed';
      showError(errorMessage);
      onPaymentError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
        <CardDescription>
          Choose your preferred payment method to complete the transaction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Summary */}
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Amount:</span>
            <span className="text-lg font-bold">
              {currency === 'INR' ? '₹' : '$'}{amount.toLocaleString()}
            </span>
          </div>
          {description && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-muted-foreground">Description:</span>
              <span className="text-sm">{description}</span>
            </div>
          )}
        </div>

        {/* Gateway Selection */}
        <div>
          <Label className="text-base font-medium mb-4 block">Select Payment Method</Label>
          <RadioGroup
            value={selectedGateway}
            onValueChange={(value) => setSelectedGateway(value as PaymentGatewayType)}
            className="space-y-3"
          >
            {availableGateways.map(gateway => (
              <div key={gateway} className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50">
                <RadioGroupItem value={gateway} id={gateway} />
                <Label htmlFor={gateway} className="flex items-center gap-3 cursor-pointer flex-1">
                  {getGatewayIcon(gateway)}
                  <div className="flex-1">
                    <div className="font-medium">{getGatewayDisplayName(gateway)}</div>
                    {gateway === 'cash_mode' && (
                      <div className="text-sm text-muted-foreground">
                        Testing mode - payment will be automatically approved
                      </div>
                    )}
                  </div>
                  {gateway !== 'cash_mode' && (
                    <Badge variant="outline">Live</Badge>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Payment Button */}
        <Button 
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>
              {getGatewayIcon(selectedGateway)}
              <span className="ml-2">
                Pay {currency === 'INR' ? '₹' : '$'}{amount.toLocaleString()} with {getGatewayDisplayName(selectedGateway)}
              </span>
            </>
          )}
        </Button>

        {/* Security Notice */}
        <div className="text-xs text-muted-foreground text-center">
          <p>🔒 Your payment information is secure and encrypted</p>
          {selectedGateway === 'cash_mode' && (
            <p className="mt-1 text-yellow-600">
              ⚠️ This is test mode - no actual payment will be processed
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
