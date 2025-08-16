
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, CheckCircle, AlertCircle, Rocket } from 'lucide-react';
import { authenticationService } from '@/services/AuthenticationService';
import { toast } from 'sonner';

const bootstrapSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/(?=.*\d)/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type BootstrapFormData = z.infer<typeof bootstrapSchema>;

interface BootstrapSetupProps {
  onBootstrapComplete: () => void;
}

export const BootstrapSetup: React.FC<BootstrapSetupProps> = ({ onBootstrapComplete }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const form = useForm<BootstrapFormData>({
    resolver: zodResolver(bootstrapSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: ''
    }
  });

  const onSubmit = async (data: BootstrapFormData) => {
    try {
      setIsCreating(true);
      setCurrentStep(1);
      
      console.log('BootstrapSetup: Starting super admin creation...');
      
      // Simulate progress steps for better UX
      setTimeout(() => setCurrentStep(2), 1000);
      setTimeout(() => setCurrentStep(3), 2000);
      
      const result = await authenticationService.bootstrapSuperAdmin(
        data.email,
        data.password,
        data.fullName
      );

      if (result.success) {
        setCurrentStep(4);
        toast.success('System initialized successfully!', {
          description: 'Welcome to your admin portal. You will be redirected shortly.',
        });
        
        // Wait a bit before completing to show success state
        setTimeout(() => {
          onBootstrapComplete();
        }, 2000);
      } else {
        console.error('BootstrapSetup: Creation failed:', result.error);
        toast.error('System initialization failed', {
          description: result.error || 'Please try again or contact support.',
        });
        setCurrentStep(0);
      }
    } catch (error) {
      console.error('BootstrapSetup: Exception during creation:', error);
      toast.error('An unexpected error occurred', {
        description: 'Please refresh the page and try again.',
      });
      setCurrentStep(0);
    } finally {
      setIsCreating(false);
    }
  };

  const steps = [
    { icon: Shield, label: 'Creating Admin Account', description: 'Setting up your super admin credentials' },
    { icon: Loader2, label: 'Configuring Security', description: 'Applying enterprise-grade security policies' },
    { icon: Rocket, label: 'Initializing System', description: 'Preparing your admin dashboard' },  
    { icon: CheckCircle, label: 'Bootstrap Complete', description: 'Welcome to your admin portal!' }
  ];

  if (isCreating) {
    const CurrentIcon = steps[currentStep]?.icon || Loader2;
    const isSpinning = currentStep < 3;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <CurrentIcon 
                  className={`h-12 w-12 text-primary ${isSpinning ? 'animate-spin' : ''}`} 
                />
                {currentStep === 3 && (
                  <div className="absolute inset-0 animate-ping">
                    <CheckCircle className="h-12 w-12 text-primary opacity-75" />
                  </div>
                )}
              </div>
            </div>
            
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              {steps[currentStep]?.label}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-6">
              {steps[currentStep]?.description}
            </p>
            
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div 
                  key={index}
                  className={`flex items-center text-sm transition-colors ${
                    index <= currentStep 
                      ? 'text-primary' 
                      : 'text-muted-foreground/50'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mr-3 transition-colors ${
                    index < currentStep 
                      ? 'bg-primary' 
                      : index === currentStep 
                        ? 'bg-primary animate-pulse' 
                        : 'bg-muted-foreground/30'
                  }`} />
                  {step.label}
                  {index < currentStep && (
                    <CheckCircle className="h-3 w-3 ml-auto text-primary" />
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 text-xs text-muted-foreground">
              Please do not close this window
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">System Bootstrap</CardTitle>
          <CardDescription className="text-base">
            Initialize your admin portal by creating the first super administrator account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">One-time Setup</p>
                <p className="text-blue-700">
                  This process creates your first admin account and cannot be repeated. 
                  Choose your credentials carefully.
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your full name" 
                        {...field}
                        className="transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="admin@yourcompany.com" 
                        {...field}
                        className="transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Create a strong password" 
                        {...field}
                        className="transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirm your password" 
                        {...field}
                        className="transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing System...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Initialize Admin Portal
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              By creating this account, you agree to our security policies and 
              will have full administrative privileges.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
