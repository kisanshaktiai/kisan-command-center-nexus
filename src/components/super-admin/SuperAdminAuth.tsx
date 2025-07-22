
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Clock, Users, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { generateDeviceFingerprint, getUserIP } from '@/utils/deviceFingerprint';

interface AdminAccessInfo {
  allowed: boolean;
  reason?: string;
  message?: string;
  user_id?: string;
  role?: string;
  last_login?: string;
  last_login_ip?: string;
  active_sessions_count?: number;
}

export const SuperAdminAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [preAuthInfo, setPreAuthInfo] = useState<AdminAccessInfo | null>(null);
  const navigate = useNavigate();

  // Check admin access when email changes
  useEffect(() => {
    if (email && email.includes('@')) {
      checkAdminAccess(email);
    } else {
      setPreAuthInfo(null);
    }
  }, [email]);

  const checkAdminAccess = async (userEmail: string) => {
    try {
      const { data, error } = await supabase.rpc('check_admin_access', {
        user_email: userEmail
      });

      if (error) {
        console.error('Pre-auth check failed:', error);
        return;
      }

      setPreAuthInfo(data as AdminAccessInfo);
    } catch (err) {
      console.error('Pre-auth check error:', err);
    }
  };

  const logLoginAttempt = async (
    userId: string | null,
    email: string,
    attemptType: 'success' | 'failed' | 'blocked',
    failureReason?: string
  ) => {
    try {
      const deviceFingerprint = generateDeviceFingerprint();
      const ipAddress = await getUserIP();

      await supabase.rpc('log_admin_login_attempt', {
        p_user_id: userId,
        p_email: email,
        p_attempt_type: attemptType,
        p_ip_address: ipAddress,
        p_user_agent: navigator.userAgent,
        p_device_fingerprint: deviceFingerprint,
        p_failure_reason: failureReason
      });
    } catch (error) {
      console.error('Failed to log login attempt:', error);
    }
  };

  const createAdminSession = async (userId: string) => {
    try {
      const deviceFingerprint = generateDeviceFingerprint();
      const ipAddress = await getUserIP();

      const { data, error } = await supabase.rpc('create_admin_session', {
        p_user_id: userId,
        p_device_fingerprint: deviceFingerprint,
        p_ip_address: ipAddress,
        p_user_agent: navigator.userAgent,
        p_remember_me: rememberMe
      });

      if (error) {
        console.error('Failed to create admin session:', error);
        return null;
      }

      // Store session token in localStorage for session management
      localStorage.setItem('admin_session_token', data);
      return data;

    } catch (error) {
      console.error('Session creation error:', error);
      return null;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('=== ENHANCED SUPER ADMIN LOGIN PROCESS STARTED ===');
      console.log('Step 1: Pre-authentication validation for:', email);

      // Step 1: Pre-authentication role check
      if (!preAuthInfo) {
        await checkAdminAccess(email);
      }

      if (preAuthInfo && !preAuthInfo.allowed) {
        await logLoginAttempt(null, email, 'blocked', preAuthInfo.message);
        throw new Error(preAuthInfo.message || 'Access denied');
      }

      console.log('Step 2: Authenticating user:', email);
      
      // Step 2: Authenticate user with email/password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Authentication failed:', signInError);
        let errorMessage = 'Invalid credentials';
        
        if (signInError.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (signInError.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address';
        }
        
        await logLoginAttempt(null, email, 'failed', errorMessage);
        throw new Error(errorMessage);
      }

      if (!signInData.user) {
        await logLoginAttempt(null, email, 'failed', 'Authentication failed - no user returned');
        throw new Error('Authentication failed - no user returned');
      }

      console.log('Step 3: Authentication successful, refreshing session to get latest metadata...');
      
      // Step 3: Force session refresh to get updated user metadata from database
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Session refresh failed:', refreshError);
        await logLoginAttempt(signInData.user.id, email, 'failed', 'Failed to refresh session');
        throw new Error('Failed to refresh session');
      }

      if (!refreshData.user) {
        await logLoginAttempt(signInData.user.id, email, 'failed', 'Session refresh failed - no user returned');
        throw new Error('Session refresh failed - no user returned');
      }

      console.log('Step 4: Session refreshed, checking user metadata:', refreshData.user.user_metadata);
      console.log('App metadata:', refreshData.user.app_metadata);
      
      // Step 4: Check if user has admin role in metadata with refreshed data
      const userRole = refreshData.user.user_metadata?.role || refreshData.user.app_metadata?.role;
      console.log('Extracted user role from refreshed session:', userRole);
      
      // Allow super_admin, platform_admin, and admin roles
      const validAdminRoles = ['super_admin', 'platform_admin', 'admin'];
      
      if (!userRole || !validAdminRoles.includes(userRole)) {
        console.error('Access denied - insufficient privileges. User role:', userRole);
        console.log('Available keys in user_metadata:', Object.keys(refreshData.user.user_metadata || {}));
        console.log('Available keys in app_metadata:', Object.keys(refreshData.user.app_metadata || {}));
        
        await logLoginAttempt(refreshData.user.id, email, 'failed', 'Access denied - Admin privileges required');
        // Sign out the user since they don't have admin access
        await supabase.auth.signOut();
        throw new Error('Access denied: You do not have administrator privileges');
      }

      console.log('Step 5: Admin privileges verified, role:', userRole);
      
      // Step 5: Create admin session for tracking
      const sessionToken = await createAdminSession(refreshData.user.id);
      if (!sessionToken) {
        console.warn('Failed to create admin session, continuing without session tracking');
      }

      // Step 6: Log successful login
      await logLoginAttempt(refreshData.user.id, email, 'success');

      // Step 7: Navigate to super admin dashboard
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

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return 'Never';
    return new Date(lastLogin).toLocaleString();
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
          {/* Pre-authentication info display */}
          {preAuthInfo && preAuthInfo.allowed && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Admin Access Verified</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Last login: {formatLastLogin(preAuthInfo.last_login)}</span>
                  </div>
                  {preAuthInfo.last_login_ip && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>From: {preAuthInfo.last_login_ip}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <span>Active sessions: {preAuthInfo.active_sessions_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {preAuthInfo && !preAuthInfo.allowed && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-800">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Access Denied</span>
                </div>
                <p className="text-xs">{preAuthInfo.message}</p>
              </div>
            </div>
          )}

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
              disabled={isLoading || (preAuthInfo && !preAuthInfo.allowed)}
            >
              {isLoading ? 'Verifying...' : 'Sign In'}
            </Button>
          </form>

          {/* Session timeout info */}
          <div className="mt-4 text-xs text-muted-foreground text-center">
            <p>Sessions expire after 30 minutes of inactivity</p>
            <p>All login attempts are logged for security</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
