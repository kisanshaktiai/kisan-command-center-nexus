import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePlans, useSubscriptions, useCreateSubscription, useCreateTransaction } from '@/hooks/useBillingCore';
import { PlanCard } from '@/components/billing/core/PlanCard';
import { SubscriptionList } from '@/components/billing/core/SubscriptionList';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Plan } from '@/types/billing/unified';

export default function FarmerSubscription() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // Get current farmer info
  const { data: farmerInfo } = useQuery({
    queryKey: ['current-farmer'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('farmer_id, tenant_id')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      const { data: farmer, error: farmerError } = await supabase
        .from('farmers')
        .select('id, farmer_name, mobile_number, tenant_id')
        .eq('id', profile.farmer_id)
        .single();
      
      if (farmerError) throw farmerError;
      
      return {
        farmerId: farmer.id,
        tenantId: farmer.tenant_id || profile.tenant_id,
        farmerName: farmer.farmer_name,
        mobileNumber: farmer.mobile_number,
      };
    },
  });

  const { data: plans, isLoading: plansLoading } = usePlans(farmerInfo?.tenantId);
  const { data: mySubscriptions } = useSubscriptions({ farmerId: farmerInfo?.farmerId });
  const createSubscription = useCreateSubscription();
  const createTransaction = useCreateTransaction();

  const activeSubscription = mySubscriptions?.find((s: any) => s.status === 'active');

  const handlePurchase = async () => {
    if (!selectedPlan || !farmerInfo) return;

    setIsPurchasing(true);
    setPurchaseSuccess(false);

    try {
      // Call payment processing edge function
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: {
          farmerId: farmerInfo.farmerId,
          tenantId: farmerInfo.tenantId,
          planId: selectedPlan.id,
          amount: selectedPlan.price,
          currency: selectedPlan.currency,
          gateway: 'virtual', // Default to virtual for now
        },
      });

      if (error) throw error;

      if (data.success) {
        setPurchaseSuccess(true);
        toast.success('Subscription activated successfully!');
        setSelectedPlan(null);
      } else {
        throw new Error(data.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <p className="text-muted-foreground">
          Choose a plan to access premium features
        </p>
      </div>

      {/* Current Subscription Status */}
      {activeSubscription && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            You have an active subscription: <strong>{activeSubscription.plan?.title}</strong>
            {activeSubscription.end_date && (
              <> (Valid until {new Date(activeSubscription.end_date).toLocaleDateString()})</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Purchase Success Alert */}
      {purchaseSuccess && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            🎉 Subscription activated successfully! You can now access all premium features.
          </AlertDescription>
        </Alert>
      )}

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Select a plan to subscribe
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plansLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : plans && plans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onSelect={setSelectedPlan}
                  isSelected={selectedPlan?.id === plan.id}
                  isLoading={isPurchasing}
                />
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              No plans available at the moment
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Confirmation */}
      {selectedPlan && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Confirm Purchase</CardTitle>
            <CardDescription>
              Review your selection before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Plan:</span>
                <span>{selectedPlan.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Duration:</span>
                <span>{selectedPlan.duration_days} days</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total Amount:</span>
                <span>{selectedPlan.currency} {selectedPlan.price.toFixed(2)}</span>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Currently using <strong>Virtual Gateway</strong> (Test Mode). 
                Payment will be auto-approved.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handlePurchase}
                disabled={isPurchasing}
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  'Confirm & Pay'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedPlan(null)}
                disabled={isPurchasing}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>My Subscriptions</CardTitle>
          <CardDescription>
            View your subscription history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionList farmerId={farmerInfo?.farmerId} />
        </CardContent>
      </Card>
    </div>
  );
}
