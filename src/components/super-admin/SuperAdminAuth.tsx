
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

  const checkAdminUser = async (email: string) => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, role, is_active')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error('Invalid admin credentials');
    }

    return data;
  };

  const generateAndSendOTP = async (userEmail: string): Promise<void> => {
    try {
      // Generate OTP using database function
      const { data: otp, error } = await supabase.rpc('generate_otp', {
        p_email: userEmail,
        p_purpose: 'login'
      });

      if (error) throw error;

      // In production, send email here
      console.log(`Generated OTP for ${userEmail}: ${otp}`);
      
      // For demo purposes, show the OTP in console
      toast.success(`OTP sent to ${userEmail}. Check console for demo OTP: ${otp}`);
    } catch (error: any) {
      console.error('Failed to generate OTP:', error);
      toast.error('Failed to send OTP');
      throw error;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // First check if user is a valid admin
      await checkAdminUser(email);

      // Verify password with Supabase Auth
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // If credentials are valid, generate and send OTP
      await generateAndSendOTP(email);
      setPendingLoginEmail(email);
      setShowOTPVerification(true);
      
      // Sign out immediately to prevent bypass
      await supabase.auth.signOut();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerification = async (otp: string) => {
    try {
      // Verify OTP using database function
      const { data: isValid, error } = await supabase.rpc('verify_otp', {
        p_email: pendingLoginEmail,
        p_otp_code: otp,
        p_purpose: 'login'
      });

      if (error) throw error;

      if (!isValid) {
        throw new Error('Invalid or expired OTP');
      }

      // OTP verified successfully, now sign in properly
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: pendingLoginEmail,
        password,
      });

      if (signInError) throw signInError;

      toast.success('Login successful');
      navigate('/super-admin');
    } catch (error: any) {
      console.error('OTP verification failed:', error);
      toast.error(error.message);
      throw error;
    }
  };

  const handleResendOTP = async (): Promise<void> => {
    await generateAndSendOTP(pendingLoginEmail);
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
              {isLoading ? 'Verifying...' : 'Sign In with 2FA'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
