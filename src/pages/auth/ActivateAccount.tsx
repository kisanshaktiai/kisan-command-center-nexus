
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCentralizedEmailService } from '@/hooks/useCentralizedEmailService';
import { useNotifications } from '@/hooks/useNotifications';

interface InvitationData {
  invitation_id: string;
  tenant_id: string;
  email: string;
  invitation_type: string;
  is_valid: boolean;
  expires_at: string;
}

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { validateInvitationToken, markInvitationClicked, markInvitationAccepted } = useCentralizedEmailService();
  const { showSuccess, showError } = useNotifications();

  // Validate invitation token on component mount
  useEffect(() => {
    if (!token) {
      setError('Invalid activation link - no token provided');
      setIsValidating(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) return;

    try {
      setIsValidating(true);
      const invitationData = await validateInvitationToken(token);
      
      if (invitationData && invitationData.is_valid) {
        setInvitation(invitationData);
        // Mark as clicked for analytics
        await markInvitationClicked(token);
      } else {
        setError('This invitation link has expired or is invalid');
      }
    } catch (error) {
      console.error('Error validating token:', error);
      setError('Failed to validate invitation link');
    } finally {
      setIsValidating(false);
    }
  };

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !invitation) {
      setError('Invalid invitation data');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsActivating(true);
    setError(null);

    try {
      // Update user password and confirm email
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
          email_confirmed: true,
          account_activated: true,
          activated_at: new Date().toISOString()
        }
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Mark invitation as accepted
      const accepted = await markInvitationAccepted(token);
      
      if (!accepted) {
        console.warn('Failed to mark invitation as accepted, but user activation succeeded');
      }

      setSuccess(true);
      showSuccess('Account activated successfully! Redirecting to dashboard...');
      
      // Redirect to tenant dashboard after brief delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Activation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to activate account');
      showError('Failed to activate account');
    } finally {
      setIsActivating(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Validating invitation...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">
                Account Activated!
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Your account has been successfully activated. You will be redirected to the dashboard shortly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
              <h2 className="text-2xl font-bold text-red-700 dark:text-red-400">
                Activation Failed
              </h2>
              <Alert variant="destructive">
                <AlertDescription>
                  {error || 'This invitation link is invalid or has expired.'}
                </AlertDescription>
              </Alert>
              <Button 
                onClick={() => navigate('/auth')}
                variant="outline"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">Activate Your Account</CardTitle>
          <CardDescription>
            Welcome! Please set your password to activate your account for <strong>{invitation.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleActivation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="bg-gray-50 dark:bg-gray-800"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                minLength={8}
              />
              <p className="text-sm text-gray-500">
                Password must be at least 8 characters long
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                minLength={8}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isActivating || !password || !confirmPassword}
            >
              {isActivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating Account...
                </>
              ) : (
                'Activate Account'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Having trouble? <a href="mailto:support@kisanshakti.in" className="text-primary hover:underline">Contact Support</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
