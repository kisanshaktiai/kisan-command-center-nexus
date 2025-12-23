import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteDetails {
  valid: boolean;
  email: string;
  role: string;
  expiresAt: string;
  metadata: {
    organizationName?: string;
    appLogo?: string;
    primaryColor?: string;
  };
}

interface AdminInviteRegistrationProps {
  inviteToken: string;
  onComplete: () => void;
}

export const AdminInviteRegistration: React.FC<AdminInviteRegistrationProps> = ({
  inviteToken,
  onComplete,
}) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
  });

  // Verify invite token on mount
  useEffect(() => {
    const verifyInvite = async () => {
      setIsVerifying(true);
      setError(null);

      try {
        const { data, error } = await supabase.functions.invoke('user-invitations', {
          body: {
            action: 'verify',
            invitation_type: 'admin',
            token: inviteToken
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data?.valid) {
          throw new Error(data?.error || 'Invalid or expired invitation');
        }

        setInviteDetails(data);
        setValue('email', data.email);
      } catch (err) {
        console.error('Error verifying invite:', err);
        setError(err instanceof Error ? err.message : 'Failed to verify invitation');
      } finally {
        setIsVerifying(false);
      }
    };

    if (inviteToken) {
      verifyInvite();
    }
  }, [inviteToken, setValue]);

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: result, error } = await supabase.functions.invoke('user-invitations', {
        body: {
          action: 'accept',
          invitation_type: 'admin',
          token: inviteToken,
          fullName: data.fullName,
          password: data.password,
          phone: data.phone || ''
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to complete registration');
      }

      // Show success and redirect to login
      onComplete();
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Verifying invitation...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && !inviteDetails) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <CardTitle className="text-2xl">Invalid Invitation</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/login')} className="w-full">
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <UserPlus className="w-12 h-12 text-primary" />
        </div>
        <CardTitle className="text-2xl">Complete Registration</CardTitle>
        <CardDescription>
          Join {inviteDetails?.metadata?.organizationName || 'our team'} as {inviteDetails?.role}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              disabled={true}
              className="bg-muted"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              {...register('fullName')}
              placeholder="Enter your full name"
              disabled={isSubmitting}
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              placeholder="Enter your phone number"
              disabled={isSubmitting}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="Create a secure password"
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword')}
              placeholder="Confirm your password"
              disabled={isSubmitting}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
