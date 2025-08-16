
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface BillingPlanStepProps {
  tenantId: string;
  onComplete: (data: any) => void;
  data: any;
  onDataChange: (data: any) => void;
}

const plans = [
  {
    id: 'Kisan_Basic',
    name: 'Kisan Basic',
    price: 999,
    interval: 'month',
    features: [
      '1,000 Farmers',
      '50 Dealers',
      '100 Products',
      '10GB Storage',
      'Basic Support',
      'Standard Analytics'
    ],
    recommended: false
  },
  {
    id: 'Shakti_Growth',
    name: 'Shakti Growth',
    price: 2999,
    interval: 'month',
    features: [
      '5,000 Farmers',
      '200 Dealers',
      '500 Products',
      '50GB Storage',
      'Priority Support',
      'Advanced Analytics',
      'Custom Branding'
    ],
    recommended: true
  },
  {
    id: 'AI_Enterprise',
    name: 'AI Enterprise',
    price: 9999,
    interval: 'month',
    features: [
      'Unlimited Farmers',
      'Unlimited Dealers',
      'Unlimited Products',
      '500GB Storage',
      '24/7 Support',
      'Advanced AI Features',
      'White-label Solution',
      'Custom Integrations'
    ],
    recommended: false
  }
];

export const BillingPlanStep: React.FC<BillingPlanStepProps> = ({
  tenantId,
  onComplete,
  data,
  onDataChange
}) => {
  const [selectedPlan, setSelectedPlan] = useState(data.selectedPlan || '');
  const [billingInterval, setBillingInterval] = useState(data.billingInterval || 'monthly');
  const { showSuccess, showError } = useNotifications();

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    const newData = { ...data, selectedPlan: planId, billingInterval };
    onDataChange(newData);
  };

  const handleSubmit = async () => {
    try {
      if (!selectedPlan) {
        showError('Please select a subscription plan');
        return;
      }

      // Update tenant with selected plan
      const { error } = await supabase
        .from('tenants')
        .update({
          subscription_plan: selectedPlan,
          metadata: {
            ...data,
            billingSetup: true,
            billingInterval,
            selectedAt: new Date().toISOString()
          }
        })
        .eq('id', tenantId);

      if (error) throw error;

      showSuccess('Subscription plan selected successfully');
      onComplete({ selectedPlan, billingInterval });
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      showError('Failed to update subscription plan');
    }
  };

  const getAnnualPrice = (monthlyPrice: number) => {
    return Math.round(monthlyPrice * 12 * 0.8); // 20% discount for annual
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Choose Your Plan</h3>
        <p className="text-muted-foreground">
          Select the subscription plan that best fits your needs
        </p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="bg-muted p-1 rounded-lg">
          <Button
            variant={billingInterval === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingInterval('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={billingInterval === 'annually' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingInterval('annually')}
          >
            Annual
            <Badge variant="secondary" className="ml-2 text-xs">20% off</Badge>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative cursor-pointer transition-all ${
              selectedPlan === plan.id
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            } ${plan.recommended ? 'border-primary' : ''}`}
            onClick={() => handlePlanSelect(plan.id)}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  <Star className="w-3 h-3 mr-1" />
                  Recommended
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="text-3xl font-bold">
                ₹{billingInterval === 'annually' ? getAnnualPrice(plan.price).toLocaleString() : plan.price.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground">
                  /{billingInterval === 'annually' ? 'year' : 'month'}
                </span>
              </div>
              {billingInterval === 'annually' && (
                <div className="text-sm text-muted-foreground">
                  ₹{(getAnnualPrice(plan.price) / 12).toFixed(0)}/month billed annually
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button
                className="w-full mt-6"
                variant={selectedPlan === plan.id ? 'default' : 'outline'}
              >
                {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Information
          </CardTitle>
          <CardDescription>
            Secure payment processing powered by Razorpay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <h4 className="font-medium">Payment Method</h4>
                <p className="text-sm text-muted-foreground">
                  Payment will be processed after plan activation
                </p>
              </div>
              <Badge variant="outline">Setup Required</Badge>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <h4 className="font-medium text-foreground mb-2">What's included:</h4>
              <ul className="space-y-1">
                <li>• 14-day free trial for all plans</li>
                <li>• No setup fees or hidden charges</li>
                <li>• Cancel anytime with no penalties</li>
                <li>• Full refund within 30 days</li>
                <li>• Secure payment processing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!selectedPlan}>
          Continue with {selectedPlan && plans.find(p => p.id === selectedPlan)?.name}
        </Button>
      </div>
    </div>
  );
};
