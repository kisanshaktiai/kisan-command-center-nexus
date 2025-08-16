
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, HelpCircle } from 'lucide-react';
import { OnboardingStep } from '@/types/onboarding';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { cn } from '@/lib/utils';

// Schema definitions for each step type
const businessVerificationSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number format'),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number format'),
  registrationCertificate: z.any().optional(),
  addressProof: z.any().optional()
});

const planSelectionSchema = z.object({
  planType: z.enum(['Kisan_Basic', 'Shakti_Growth', 'AI_Enterprise']),
  billingCycle: z.enum(['monthly', 'quarterly', 'annually']),
  addOns: z.array(z.string()).optional()
});

const brandingSchema = z.object({
  logo: z.any().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  companyDescription: z.string().max(500, 'Description must be less than 500 characters')
});

const featureTogglesSchema = z.object({
  enabledFeatures: z.array(z.string()),
  permissions: z.record(z.boolean())
});

const teamInvitesSchema = z.object({
  invites: z.array(z.object({
    email: z.string().email('Invalid email address'),
    role: z.string().min(1, 'Role is required'),
    name: z.string().min(2, 'Name must be at least 2 characters')
  }))
});

interface OnboardingStepFormProps {
  step: OnboardingStep;
  stepIndex: number;
}

export const OnboardingStepForm: React.FC<OnboardingStepFormProps> = ({ step, stepIndex }) => {
  const { formData, updateStepData, validationErrors } = useOnboarding();
  
  const getSchema = () => {
    switch (step.step_name.toLowerCase().replace(/\s+/g, '')) {
      case 'businessverification':
        return businessVerificationSchema;
      case 'planselection':
        return planSelectionSchema;
      case 'branding':
        return brandingSchema;
      case 'featuretoggles':
        return featureTogglesSchema;
      case 'teaminvites':
        return teamInvitesSchema;
      default:
        return z.object({});
    }
  };

  const stepKey = step.step_name.toLowerCase().replace(/\s+/g, '') as keyof typeof formData;
  const currentData = formData[stepKey] || {};
  
  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: currentData,
    mode: 'onChange'
  });

  const onSubmit = async (data: any) => {
    await updateStepData(stepKey, data);
  };

  // Auto-submit on form changes
  React.useEffect(() => {
    const subscription = form.watch((data) => {
      if (form.formState.isValid) {
        updateStepData(stepKey, data);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, stepKey, updateStepData]);

  const renderBusinessVerificationForm = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="companyName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Company Name *</FormLabel>
            <FormControl>
              <Input placeholder="Enter your company name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="gstNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                GST Number *
                <HelpCircle className="w-4 h-4 text-gray-400" title="Enter your 15-digit GST identification number" />
              </FormLabel>
              <FormControl>
                <Input placeholder="22AAAAA0000A1Z5" {...field} />
              </FormControl>
              <FormDescription>
                Enter your 15-digit GST identification number
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="panNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                PAN Number *
                <HelpCircle className="w-4 h-4 text-gray-400" title="Enter your 10-character PAN number" />
              </FormLabel>
              <FormControl>
                <Input placeholder="ABCDE1234F" {...field} />
              </FormControl>
              <FormDescription>
                Enter your 10-character PAN number
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="registrationCertificate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registration Certificate</FormLabel>
              <FormControl>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Button type="button" variant="outline">
                      Upload Certificate
                    </Button>
                    <p className="mt-2 text-sm text-gray-500">
                      PDF, JPG, PNG up to 10MB
                    </p>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="addressProof"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address Proof</FormLabel>
              <FormControl>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Button type="button" variant="outline">
                      Upload Address Proof
                    </Button>
                    <p className="mt-2 text-sm text-gray-500">
                      PDF, JPG, PNG up to 10MB
                    </p>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderPlanSelectionForm = () => (
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
  );

  const renderBrandingForm = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="logo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Company Logo</FormLabel>
            <FormControl>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-16 w-16 text-gray-400" />
                <div className="mt-4">
                  <Button type="button" variant="outline">
                    Upload Logo
                  </Button>
                  <p className="mt-2 text-sm text-gray-500">
                    PNG, JPG up to 5MB. Recommended: 200x200px
                  </p>
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="primaryColor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Color *</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-3">
                  <Input
                    type="color"
                    className="w-16 h-10 rounded border-0 cursor-pointer"
                    {...field}
                  />
                  <Input
                    placeholder="#3B82F6"
                    className="flex-1"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="secondaryColor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Secondary Color *</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-3">
                  <Input
                    type="color"
                    className="w-16 h-10 rounded border-0 cursor-pointer"
                    {...field}
                  />
                  <Input
                    placeholder="#64748B"
                    className="flex-1"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="companyDescription"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Company Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Tell us about your company..."
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormDescription>
              {field.value?.length || 0}/500 characters
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderStepContent = () => {
    switch (step.step_name.toLowerCase().replace(/\s+/g, '')) {
      case 'businessverification':
        return renderBusinessVerificationForm();
      case 'planselection':
        return renderPlanSelectionForm();
      case 'branding':
        return renderBrandingForm();
      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Form configuration for "{step.step_name}" is not yet implemented.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              This step will be available soon.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Validation Errors */}
      {validationErrors[stepKey] && validationErrors[stepKey].length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors[stepKey].map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {renderStepContent()}
        </form>
      </Form>
    </div>
  );
};
