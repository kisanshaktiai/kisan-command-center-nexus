
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { OTPVerification } from '@/components/auth/OTPVerification';

export const SuperAdminAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingLoginEmail, setPendingLoginEmail] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('=== SUPER ADMIN LOGIN PROCESS STARTED ===');
      console.log('Step 1: Checking admin status before authentication for:', email);
      
      // Step 1: First check if user is in admin_users table before any authentication
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true);

      console.log('Admin user pre-check result:', { adminUser, adminError });

      if (adminError) {
        console.error('Database error checking admin user:', adminError);
        throw new Error('Database error occurred');
      }

      if (!adminUser || adminUser.length === 0) {
        console.error('No admin user found for email:', email);
        throw new Error('Access denied: User is not registered as an admin');
      }

      const user = adminUser[0];
      console.log('Found admin user:', user);

      if (user.role !== 'super_admin') {
        console.error('User role is not super_admin:', user.role);
        throw new Error('Access denied: Insufficient privileges');
      }

      console.log('Step 2: Admin verification successful, now verifying password for:', email);
      
      // Step 2: Now verify password credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Password verification failed:', signInError);
        // Sign out if there was any partial authentication
        await supabase.auth.signOut();
        throw new Error('Invalid email or password');
      }

      console.log('Step 3: Password verified successfully, user authenticated');

      // Step 3: User is now authenticated and verified as admin, redirect to dashboard
      console.log('Step 4: Redirecting to super-admin dashboard');
      toast.success('Login successful');
      navigate('/super-admin');
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message);
      toast.error(err.message);
      // Ensure user is signed out on error
      await supabase.auth.signOut();
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerification = async (otp: string) => {
    try {
      console.log('=== OTP VERIFICATION STARTED ===');
      console.log('Verifying OTP for email:', pendingLoginEmail);

      const { data, error } = await supabase.auth.verifyOtp({
        email: pendingLoginEmail,
        token: otp,
        type: 'email'
      });

      if (error) {
        console.error('OTP verification error:', error);
        throw new Error('Invalid verification code');
      }

      if (!data.user) {
        throw new Error('Verification failed');
      }

      console.log('OTP verified successfully, user logged in');
      toast.success('Login successful');
      navigate('/super-admin');
    } catch (error: any) {
      console.error('OTP verification failed:', error);
      toast.error(error.message);
      throw error;
    }
  };

  const handleResendOTP = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: pendingLoginEmail,
        options: {
          shouldCreateUser: false,
        }
      });

      if (error) throw error;
      
      toast.success('New verification code sent');
    } catch (error: any) {
      console.error('Failed to resend OTP:', error);
      toast.error('Failed to resend verification code');
      throw error;
    }
  };

  const handleBackToLogin = () => {
    setShowOTPVerification(false);
    setPendingLoginEmail('');
    setPassword('');
  };

  if (showOTPVerification) {
    return (
      <OTPVerification
        email={pendingLoginEmail}
        onVerify={handleOTPVerification}
        onResendOTP={handleResendOTP}
        onBack={handleBackToLogin}
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
                placeholder="admin@example.com"
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
        </CardContent>
      </Card>
    </div>
  );
};
