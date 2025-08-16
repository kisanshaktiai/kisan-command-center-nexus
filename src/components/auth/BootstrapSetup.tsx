import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { PasswordStrength, validatePassword } from '@/components/ui/password-strength';
import { Loader2, Crown, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthenticationService } from '@/hooks/useAuthenticationService';
import { AuthErrorBoundary } from './AuthErrorBoundary';
import { authenticationService } from '@/services/AuthenticationService';
import { supabase } from '@/integrations/supabase/client';

interface BootstrapSetupProps {
  onBootstrapComplete?: () => void;
}

export const BootstrapSetup: React.FC<BootstrapSetupProps> = ({ onBootstrapComplete }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [existingAdmins, setExistingAdmins] = useState<any[]>([]);
  const [bootstrapInconsistent, setBootstrapInconsistent] = useState(false);
  
  const { bootstrapSuperAdmin, isLoading, error, clearError } = useAuthenticationService();

  // Check for existing admins and bootstrap state on component mount
  useEffect(() => {
    checkSystemState();
  }, []);

  const checkSystemState = async () => {
    try {
      setIsCheckingExisting(true);
      
      // Check comprehensive bootstrap status first
      const isCompleted = await authenticationService.isBootstrapCompleted();
      console.log('BootstrapSetup: Bootstrap status from service:', isCompleted);
      
      if (isCompleted) {
        console.log('BootstrapSetup: Bootstrap completed, should not show this component');
        onBootstrapComplete?.();
        return;
      }

      // Check for any existing admins to show appropriate message
      const { data: adminUsers, error } = await supabase
        .from('admin_users')
        .select('id, email, full_name, role, is_active, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('BootstrapSetup: Error checking existing admins:', error);
      } else {
        setExistingAdmins(adminUsers || []);
        
        // If admins exist but bootstrap check says incomplete, this is inconsistent
        if (adminUsers && adminUsers.length > 0) {
          console.warn('BootstrapSetup: Inconsistent state - admins exist but bootstrap incomplete');
          setBootstrapInconsistent(true);
          toast.warning('System state inconsistency detected. Refreshing...');
          
          // Try to fix the inconsistency by re-checking
          setTimeout(() => {
            onBootstrapComplete?.();
          }, 2000);
          return;
        }
      }
    } catch (error) {
      console.error('BootstrapSetup: Error checking system state:', error);
      toast.error('Failed to check system state');
    } finally {
      setIsCheckingExisting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced client-side validation
    if (!formData.email || !formData.password || !formData.fullName || !formData.confirmPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (formData.email.length > 254) {
      toast.error('Email address is too long');
      return;
    }

    // Full name validation
    const trimmedName = formData.fullName.trim();
    if (trimmedName.length < 2) {
      toast.error('Full name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 100) {
      toast.error('Full name is too long');
      return;
    }

    if (!/^[a-zA-Z\s\-']+$/.test(trimmedName)) {
      toast.error('Full name contains invalid characters');
      return;
    }

    // Password validation
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      toast.error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.errors[0]);
      return;
    }

    // Call service layer with sanitized inputs
    await bootstrapSuperAdmin(
      formData.email.trim().toLowerCase(),
      formData.password,
      trimmedName,
      (authState) => {
        toast.success('Super Admin account created successfully!');
        console.log('BootstrapSetup: Bootstrap completed, triggering callback');
        setTimeout(() => {
          onBootstrapComplete?.();
          window.location.href = '/super-admin';
        }, 500);
      },
      (error) => {
        console.error('BootstrapSetup: Bootstrap error:', error);
        if (error.includes('already initialized') || error.includes('already exists')) {
          toast.error('System is already initialized. Refreshing...');
          setTimeout(() => {
            onBootstrapComplete?.();
          }, 2000);
        } else if (error.includes('rate limit') || error.includes('Too many')) {
          toast.error('Too many attempts. Please wait before trying again.');
        } else {
          toast.error(error || 'Failed to create admin account');
        }
      }
    );
  };

  // Show loading state while checking system state
  if (isCheckingExisting) {
    return (
      <AuthErrorBoundary>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <div className="text-lg font-medium mb-2">Checking system status...</div>
              <div className="text-sm text-muted-foreground">Please wait</div>
            </CardContent>
          </Card>
        </div>
      </AuthErrorBoundary>
    );
  }

  // Show inconsistency warning
  if (bootstrapInconsistent) {
    return (
      <AuthErrorBoundary>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-4 text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">System State Inconsistency</CardTitle>
                <CardDescription>
                  Detecting and resolving system configuration issues...
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The system is resolving configuration inconsistencies. You will be redirected automatically.
                </AlertDescription>
              </Alert>
              
              <Button
                onClick={() => onBootstrapComplete?.()}
                className="w-full"
              >
                Continue to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </AuthErrorBoundary>
    );
  }

  // Show warning if admins already exist
  if (existingAdmins.length > 0) {
    return (
      <AuthErrorBoundary>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-4 text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">System Already Initialized</CardTitle>
                <CardDescription>
                  This system already has administrator accounts configured
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Found {existingAdmins.length} existing administrator account{existingAdmins.length > 1 ? 's' : ''}. 
                  Please use the login form to access the system.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Existing Administrators:</h4>
                {existingAdmins.map((admin) => (
                  <div key={admin.id} className="p-2 bg-muted rounded text-sm">
                    <div className="font-medium">{admin.full_name}</div>
                    <div className="text-muted-foreground">{admin.email} - {admin.role}</div>
                  </div>
                ))}
              </div>
              
              <Button
                onClick={() => onBootstrapComplete?.()}
                className="w-full"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </AuthErrorBoundary>
    );
  }

  return (
    <AuthErrorBoundary>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">System Bootstrap</CardTitle>
              <CardDescription>
                Create the first Super Admin account to initialize the system
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Enter your full name"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="admin@yourcompany.com"
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Create a strong password"
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

              {formData.password && (
                <PasswordStrength password={formData.password} />
              )}

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Confirm your password"
                    disabled={isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
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
                    Creating Super Admin...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Initialize System
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                This will create the first administrator account and complete the system setup.
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthErrorBoundary>
  );
};
