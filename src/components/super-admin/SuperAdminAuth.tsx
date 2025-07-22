
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { OTPVerification } from '@/components/auth/OTPVerification';
import { useAuth } from '@/contexts/AuthContext';

export const SuperAdminAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOTPScreen, setShowOTPScreen] = useState(false);
  const [userId, setUserId] = useState('');
  const navigate = useNavigate();
  const { checkAdminStatus } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('=== STARTING SUPER ADMIN LOGIN ===');
      console.log('Email:', email);
      
      // Step 1: Authenticate with Supabase Auth first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Authentication failed - no user returned');
      }

      console.log('Auth successful, user ID:', authData.user.id);
      setUserId(authData.user.id);

      // Step 2: Check admin status after successful authentication
      console.log('Checking admin status...');
      
      const { data: adminCheck, error: adminError } = await supabase
        .from('admin_users')
        .select('id, email, role, is_active, full_name')
        .eq('id', authData.user.id)
        .single();

      console.log('Admin check result:', adminCheck);
      console.log('Admin check error:', adminError);

      if (adminError) {
        console.error('Admin check failed:', adminError);
        // Sign out the user since they're not an admin
        await supabase.auth.signOut();
        throw new Error('No admin privileges found for this user');
      }

      if (!adminCheck) {
        await supabase.auth.signOut();
        throw new Error('This email is not registered as an administrator');
      }

      if (adminCheck.role !== 'super_admin') {
        await supabase.auth.signOut();
        throw new Error(`Insufficient privileges. Your role: ${adminCheck.role}. Required: super_admin`);
      }

      if (!adminCheck.is_active) {
        await supabase.auth.signOut();
        throw new Error('Administrator account is deactivated');
      }

      console.log('Admin status verified, sending OTP for 2FA...');
      
      // Step 3: Send OTP for 2FA
      try {
        const response = await supabase.functions.invoke('send-admin-otp', {
          body: { email, userId: authData.user.id }
        });

        if (response.error) {
          console.error('Error sending OTP:', response.error);
          throw new Error('Failed to send verification code. Please try again.');
        }

        // Move to OTP verification screen
        setShowOTPScreen(true);
        toast.success('Verification code sent to your email');
        
      } catch (otpError: any) {
        console.error('OTP send error:', otpError);
        throw new Error('Failed to send verification code: ' + otpError.message);
      }
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('verify-admin-otp', {
        body: { email, otp }
      });

      if (response.error) {
        throw new Error('Invalid or expired verification code');
      }

      // Make sure to check admin status in context to update UI
      await checkAdminStatus();
      
      console.log('=== LOGIN SUCCESS ===');
      toast.success('Login successful');
      
      // Navigate to dashboard
      setTimeout(() => {
        navigate('/super-admin');
      }, 500);
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setIsLoading(true);
      const response = await supabase.functions.invoke('send-admin-otp', {
        body: { email, userId }
      });

      if (response.error) {
        throw new Error('Failed to resend verification code');
      }

      toast.success('New verification code sent to your email');
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setShowOTPScreen(false);
  };

  // Show OTP verification screen if we're at that step
  if (showOTPScreen) {
    return (
      <OTPVerification
        email={email}
        onVerify={handleVerifyOTP}
        onResendOTP={handleResendOTP}
        onBack={handleBack}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Super Admin Access</CardTitle>
          <p className="text-muted-foreground">
            Enter your credentials to access the admin panel
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={isLoading}
              />
              <label 
                htmlFor="remember" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember me for 30 days
              </label>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 text-xs text-muted-foreground text-center">
            <p>Only users with super admin role can access this area</p>
            <p>All login attempts are logged for security</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
