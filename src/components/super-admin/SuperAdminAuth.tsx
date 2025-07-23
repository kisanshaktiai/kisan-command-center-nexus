
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export const SuperAdminAuth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const validateAdminAccess = async (): Promise<void> => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Authentication required');
      }

      // Check if user is in admin_users table with proper role
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('id', user.id)
        .eq('is_active', true)
        .single();

      if (adminError || !adminUser) {
        throw new Error('Access denied: Admin privileges required');
      }

      if (!['super_admin', 'platform_admin'].includes(adminUser.role)) {
        throw new Error('Access denied: Insufficient privileges');
      }

      // Log successful admin access
      await supabase.rpc('log_security_event', {
        event_type: 'admin_login_success',
        user_id: user.id,
        metadata: {
          role: adminUser.role,
          timestamp: new Date().toISOString(),
          ip_address: 'client_side'
        }
      }).catch(() => {
        // Fail silently for logging
        console.warn('Failed to log security event');
      });

    } catch (error) {
      // Log failed access attempt
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('log_security_event', {
          event_type: 'admin_access_denied',
          user_id: user.id,
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            ip_address: 'client_side'
          }
        }).catch(() => {
          console.warn('Failed to log security event');
        });
      }
      
      throw error;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Attempt authentication
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Authentication failed');
      }

      // Validate admin access
      await validateAdminAccess();

      toast.success('Successfully logged in as admin');
      navigate('/super-admin/overview');

    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Super Admin Access</CardTitle>
            <CardDescription>
              Secure access to administrative functions
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Admin Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
