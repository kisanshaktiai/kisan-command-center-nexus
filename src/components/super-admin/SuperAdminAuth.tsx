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
    console.log('Checking admin user for email:', email);
    
    // First try to find user by email in admin_users table
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role, is_active')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle();

    console.log('Admin user query result:', { adminUser, adminError });

    if (adminError) {
      console.error('Error querying admin_users:', adminError);
      throw new Error('Database error checking admin credentials');
    }

    if (!adminUser) {
      // If user doesn't exist in admin_users, try to create them as super_admin
      console.log('Admin user not found, attempting to create...');
      
      // First check if this user exists in auth.users
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (!authError && authUser && authUser.email === email) {
        // User exists in auth, add them to admin_users
        const { data: newAdminUser, error: insertError } = await supabase
          .from('admin_users')
          .insert({
            email: email,
            role: 'super_admin',
            full_name: 'Super Admin',
            is_active: true
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating admin user:', insertError);
          throw new Error('Could not create admin user');
        }

        console.log('Admin user created:', newAdminUser);
        return newAdminUser;
      } else {
        throw new Error('Invalid admin credentials - user not found');
      }
    }

    return adminUser;
  };

  const generateAndSendOTP = async (userEmail: string): Promise<void> => {
    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // For demo purposes, show the OTP in console and toast
      console.log(`Generated OTP for ${userEmail}: ${otp}`);
      toast.success(`OTP sent to ${userEmail}. Check console for demo OTP: ${otp}`);
      
      // Store OTP temporarily (in production, use proper storage)
      localStorage.setItem(`otp_${userEmail}`, JSON.stringify({
        otp,
        expires: Date.now() + 10 * 60 * 1000 // 10 minutes
      }));
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
      console.log('Starting login process for:', email);
      
      // First try to sign in to verify credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Auth sign in result:', { signInData, signInError });

      if (signInError) {
        console.error('Auth sign in error:', signInError);
        throw new Error('Invalid email or password');
      }

      // Now check if user is admin (this will create admin record if needed)
      await checkAdminUser(email);

      // If we get here, credentials are valid and user is admin
      // Generate and send OTP
      await generateAndSendOTP(email);
      setPendingLoginEmail(email);
      setShowOTPVerification(true);
      
      // Sign out immediately to prevent bypass
      await supabase.auth.signOut();
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerification = async (otp: string) => {
    try {
      // Get stored OTP
      const storedData = localStorage.getItem(`otp_${pendingLoginEmail}`);
      if (!storedData) {
        throw new Error('OTP not found or expired');
      }
      
      const { otp: storedOtp, expires } = JSON.parse(storedData);
      
      if (Date.now() > expires) {
        localStorage.removeItem(`otp_${pendingLoginEmail}`);
        throw new Error('OTP has expired');
      }
      
      if (otp !== storedOtp) {
        throw new Error('Invalid OTP');
      }
      
      // Clean up stored OTP
      localStorage.removeItem(`otp_${pendingLoginEmail}`);

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
