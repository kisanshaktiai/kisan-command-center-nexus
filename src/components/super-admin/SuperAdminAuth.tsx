import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OTPVerification } from '@/components/auth/OTPVerification';
import { useNavigate } from 'react-router-dom';

interface SuperAdminAuthProps {
  autocomplete?: string;
}

export const SuperAdminAuth: React.FC<SuperAdminAuthProps> = ({ autocomplete = "off" }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Reset form state when component mounts
  useEffect(() => {
    // Clear form data on component mount
    return () => {
      // Clear form state when component unmounts
      setEmail("");
      setPassword("");
      setOtp("");
    };
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsAuthenticating(true);

    try {
      // In a real implementation, this would verify credentials and send OTP
      // For demo purposes, we'll simulate OTP being sent
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data, error } = await signIn(email, password);
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data) {
        // In a real 2FA implementation, you would send OTP here
        // For now, we'll simulate successful authentication
        navigate('/super-admin');
      } else {
        setOtpSent(true);
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setIsAuthenticating(true);

    try {
      // In a real implementation, this would verify the OTP
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (otp === '123456') {
        navigate('/super-admin');
      } else {
        throw new Error('Invalid verification code');
      }
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    try {
      // In a real implementation, this would resend the OTP
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Show success message
    } catch (error) {
      // Handle error
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary">Platform Admin</h1>
          <p className="mt-2 text-center text-base text-muted-foreground">
            Sign in to manage the multi-tenant platform
          </p>
        </div>

        {!otpSent ? (
          <Card>
            <CardHeader>
              <CardTitle>Admin Sign In</CardTitle>
              <CardDescription>
                Please enter your credentials to access the admin area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4" autoComplete={autocomplete}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password" // Prevent browser from autofilling
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
                {loginError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Authentication Error</AlertTitle>
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Enter the verification code sent to your email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOtpSubmit} className="space-y-4" autoComplete="off">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <OTPVerification
                    value={otp}
                    onChange={setOtp}
                    valueLength={6}
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isAuthenticating || otp.length < 6}
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
                {otpError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Verification Error</AlertTitle>
                    <AlertDescription>{otpError}</AlertDescription>
                  </Alert>
                )}
                <div className="text-center text-sm">
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={handleResendOtp}
                    disabled={isResending}
                  >
                    {isResending ? 'Sending...' : 'Resend code'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
