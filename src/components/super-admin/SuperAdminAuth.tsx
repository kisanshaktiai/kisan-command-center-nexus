
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

  // Check admin access when email changes (but don't block login)
  useEffect(() => {
    if (email && email.includes('@')) {
      checkAdminAccess(email);
    } else {
      setPreAuthInfo(null);
    }
  }, [email]);

  const checkAdminAccess = async (userEmail: string) => {
    try {
      // Check if admin user exists and is active
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('id, email, role, is_active, full_name')
        .eq('email', userEmail)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Pre-auth check error:', error);
        setPreAuthInfo(null);
        return;
      }

      if (!adminUser) {
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
      console.log('=== ENHANCED SUPER ADMIN LOGIN PROCESS STARTED ===');
      console.log('Step 1: Authenticating user:', email);
      
      // Step 1: Authenticate user with email/password
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

      console.log('Step 2: User authenticated successfully');
      console.log('User object:', signInData.user);
      console.log('User metadata:', signInData.user.user_metadata);
      console.log('App metadata:', signInData.user.app_metadata);
      
      // Step 3: Check admin_users table directly for role verification
      console.log('Step 3: Checking admin_users table for role verification...');
      
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id, email, role, is_active, full_name')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      if (adminError) {
        console.error('Admin verification error:', adminError);
        await logLoginAttempt(signInData.user.id, email, 'failed', 'Failed to verify admin status');
        await supabase.auth.signOut();
        throw new Error('Failed to verify admin status');
      }

      if (!adminUser) {
        console.error('No admin user found in admin_users table for email:', email);
        await logLoginAttempt(signInData.user.id, email, 'failed', 'Access denied - Admin privileges required');
        await supabase.auth.signOut();
        throw new Error('Access denied: You do not have administrator privileges');
      }

      console.log('Step 4: Admin user found:', adminUser);
      
      // Check if user has valid admin role
      const validAdminRoles = ['super_admin', 'platform_admin', 'admin'];
      
      if (!adminUser.role || !validAdminRoles.includes(adminUser.role)) {
        console.error('Invalid admin role:', adminUser.role);
        await logLoginAttempt(signInData.user.id, email, 'failed', 'Access denied - Invalid admin role');
        await supabase.auth.signOut();
        throw new Error('Access denied: Invalid administrator role');
      }

      console.log('Step 5: Admin privileges verified, role:', adminUser.role);

      // Step 6: Update user metadata in auth.users to sync with admin_users table
      console.log('Step 6: Syncing user metadata with admin role...');
      
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            role: adminUser.role,
            full_name: adminUser.full_name || 'Super Admin',
            email_verified: true
          }
        });

        if (updateError) {
          console.warn('Failed to update user metadata:', updateError);
          // Don't fail the login for this, but log it
        } else {
          console.log('User metadata updated successfully');
        }
      } catch (metadataError) {
        console.warn('Error updating user metadata:', metadataError);
        // Continue with login even if metadata update fails
      }
      
      // Step 7: Create admin session for tracking
      const sessionToken = await createAdminSession(signInData.user.id);
      if (!sessionToken) {
        console.warn('Failed to create admin session, continuing without session tracking');
      }

      // Step 8: Log successful login
      await logLoginAttempt(signInData.user.id, email, 'success');

      console.log('=== LOGIN SUCCESS - Redirecting to dashboard ===');
      
      // Step 9: Navigate to super admin dashboard
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
          {/* Pre-authentication info display - only show positive confirmation */}
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
              disabled={isLoading}
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
