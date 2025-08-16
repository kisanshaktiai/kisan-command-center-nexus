
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const planSelectionSchema = z.object({
  planType: z.enum(['Kisan_Basic', 'Shakti_Growth', 'AI_Enterprise']),
  billingCycle: z.enum(['monthly', 'quarterly', 'annually']),
  addOns: z.array(z.string()).optional()
});

type PlanSelectionData = z.infer<typeof planSelectionSchema>;

interface PlanSelectionFormProps {
  data: Partial<PlanSelectionData>;
  onDataChange: (data: Partial<PlanSelectionData>) => void;
}

export const PlanSelectionForm: React.FC<PlanSelectionFormProps> = ({ 
  data, 
  onDataChange 
}) => {
  const form = useForm<PlanSelectionData>({
    resolver: zodResolver(planSelectionSchema),
    defaultValues: {
      planType: data.planType || 'Kisan_Basic',
      billingCycle: data.billingCycle || 'monthly',
      addOns: data.addOns || []
    },
    mode: 'onChange'
  });

  React.useEffect(() => {
    const subscription = form.watch((formData) => {
      if (form.formState.isValid) {
        onDataChange(formData as Partial<PlanSelectionData>);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  return (
    <Form {...form}>
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="planType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Choose Your Plan *</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {[
                  { value: 'Kisan_Basic', name: 'Kisan Basic', price: '₹999/month', features: ['Up to 1,000 farmers', 'Basic analytics', 'Email support'] },
                  { value: 'Shakti_Growth', name: 'Shakti Growth', price: '₹2,999/month', features: ['Up to 5,000 farmers', 'Advanced analytics', 'Priority support'] },
                  { value: 'AI_Enterprise', name: 'AI Enterprise', price: '₹9,999/month', features: ['Unlimited farmers', 'AI insights', '24/7 support'] }
                ].map((plan) => (
                  <Card
                    key={plan.value}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      field.value === plan.value ? "ring-2 ring-blue-500 bg-blue-50" : ""
                    )}
                    onClick={() => field.onChange(plan.value)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <p className="text-2xl font-bold text-blue-600">{plan.price}</p>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="text-sm text-gray-600">• {feature}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="billingCycle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Cycle *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select billing cycle" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly (10% off)</SelectItem>
                  <SelectItem value="annually">Annually (20% off)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
};
