
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

  useEffect(() => {
    if (email && email.includes('@')) {
      checkAdminAccess(email);
    } else {
      setPreAuthInfo(null);
    }
  }, [email]);

  const checkAdminAccess = async (userEmail: string) => {
    try {
      console.log('Checking admin access for email:', userEmail);
      
      // Check if admin user exists with super_admin role and is active
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('id, email, role, is_active, full_name')
        .eq('email', userEmail)
        .eq('role', 'super_admin')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Pre-auth check error:', error);
        setPreAuthInfo(null);
        return;
      }

      console.log('Admin user query result:', adminUser);

      if (!adminUser) {
        console.log('No super admin record found for email:', userEmail);
        setPreAuthInfo(null);
        return;
      }

      setPreAuthInfo({
        allowed: true,
        user_id: adminUser.id,
        role: adminUser.role,
        last_login: null,
        last_login_ip: null,
        active_sessions_count: 0
      });
    } catch (err) {
      console.error('Pre-auth check error:', err);
      setPreAuthInfo(null);
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

      const logEntry = {
        userId,
        email,
        attemptType,
        ipAddress,
        userAgent: navigator.userAgent,
        deviceFingerprint,
        failureReason,
        timestamp: new Date().toISOString()
      };

      const existingLogs = JSON.parse(localStorage.getItem('admin_login_logs') || '[]');
      existingLogs.push(logEntry);
      
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }
      
      localStorage.setItem('admin_login_logs', JSON.stringify(existingLogs));
      
      console.log('Login attempt logged:', logEntry);
    } catch (error) {
      console.error('Failed to log login attempt:', error);
    }
  };

  const createAdminSession = async (userId: string) => {
    try {
      const deviceFingerprint = generateDeviceFingerprint();
      const ipAddress = await getUserIP();
      const sessionToken = crypto.randomUUID() + '-' + Date.now();
      const expiresAt = new Date(
        Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000)
      );

      const sessionInfo = {
        userId,
        sessionToken,
        deviceFingerprint,
        ipAddress,
        userAgent: navigator.userAgent,
        rememberMe,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      localStorage.setItem('admin_session_token', sessionToken);
      localStorage.setItem('admin_session_info', JSON.stringify(sessionInfo));

      console.log('Admin session created:', sessionInfo);
      return sessionToken;

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
      console.log('=== SUPER ADMIN LOGIN PROCESS ===');
      console.log('Step 1: Starting authentication for email:', email);
      
      // Step 1: First check if user exists in admin_users table
      console.log('Step 1.1: Checking admin_users table for email:', email);
      const { data: adminCheck, error: adminCheckError } = await supabase
        .from('admin_users')
        .select('id, email, role, is_active, full_name')
        .eq('email', email)
        .maybeSingle();

      if (adminCheckError) {
        console.error('Error checking admin_users table:', adminCheckError);
        await logLoginAttempt(null, email, 'failed', 'Database error while checking admin status');
        throw new Error('Database error occurred. Please try again.');
      }

      console.log('Admin check result:', adminCheck);

      if (!adminCheck) {
        console.error('No admin record found for email:', email);
        await logLoginAttempt(null, email, 'failed', 'No admin record found');
        throw new Error('This email is not registered as an administrator.');
      }

      if (adminCheck.role !== 'super_admin') {
        console.error('User does not have super_admin role:', adminCheck.role);
        await logLoginAttempt(null, email, 'failed', 'Insufficient privileges - not super admin');
        throw new Error('Super admin privileges required. Current role: ' + adminCheck.role);
      }

      if (!adminCheck.is_active) {
        console.error('Admin account is not active');
        await logLoginAttempt(null, email, 'failed', 'Admin account is deactivated');
        throw new Error('Administrator account is deactivated. Please contact support.');
      }

      console.log('Step 2: Admin verification passed. Attempting Supabase authentication...');
      
      // Step 2: Authenticate with Supabase Auth
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Supabase authentication failed:', signInError);
        let errorMessage = 'Authentication failed';
        
        if (signInError.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (signInError.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address';
        } else if (signInError.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please try again later.';
        } else {
          errorMessage = signInError.message;
        }
        
        await logLoginAttempt(null, email, 'failed', errorMessage);
        throw new Error(errorMessage);
      }

      if (!signInData.user) {
        await logLoginAttempt(null, email, 'failed', 'Authentication failed - no user returned');
        throw new Error('Authentication failed - no user returned');
      }

      console.log('Step 3: Supabase authentication successful for user:', signInData.user.id);
      
      // Step 3: Create admin session for tracking
      const sessionToken = await createAdminSession(signInData.user.id);
      if (!sessionToken) {
        console.warn('Failed to create admin session, continuing without session tracking');
      }

      // Step 4: Log successful login
      await logLoginAttempt(signInData.user.id, email, 'success');

      console.log('=== LOGIN SUCCESS - Redirecting to dashboard ===');
      
      toast.success('Login successful');
      
      setTimeout(() => {
        navigate('/super-admin');
      }, 500);
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message);
      toast.error(err.message);
      // Only sign out if we actually signed in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.signOut();
      }
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
          {preAuthInfo && preAuthInfo.allowed && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Super Admin Access Verified</span>
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
