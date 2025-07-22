
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const SuperAdminAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('=== SUPER ADMIN LOGIN PROCESS STARTED ===');
      console.log('Step 1: Authenticating user:', email);
      
      // Step 1: Authenticate user with email/password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Authentication failed:', signInError);
        throw new Error('Invalid email or password');
      }

      if (!signInData.user) {
        throw new Error('Authentication failed - no user returned');
      }

      console.log('Step 2: Authentication successful, checking user role');
      
      // Step 2: Check if user has admin role in metadata
      const userRole = signInData.user.user_metadata?.role || signInData.user.app_metadata?.role;
      console.log('User role from metadata:', userRole);
      
      if (!userRole || !['super_admin', 'platform_admin', 'admin'].includes(userRole)) {
        console.error('Access denied - insufficient privileges. User role:', userRole);
        // Sign out the user since they don't have admin access
        await supabase.auth.signOut();
        throw new Error('Access denied: You do not have administrator privileges');
      }

      console.log('Step 3: Admin privileges verified, redirecting to dashboard');
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
