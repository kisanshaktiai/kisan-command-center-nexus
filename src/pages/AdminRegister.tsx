import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { PasswordStrength, validatePassword } from '@/components/ui/password-strength';
import { Loader2, Shield, Eye, EyeOff, UserPlus, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTenantBranding } from '@/components/auth/TenantBrandingProvider';

interface InviteData {
  valid: boolean;
  email: string;
  role: string;
  expiresAt: string;
  metadata?: {
    organizationName?: string;
    primaryColor?: string;
    appLogo?: string;
  };
}

const AdminRegister = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('invite');
  const { setBranding } = useTenantBranding();

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    phone: ''
  });

  // Verify invite token on component mount
  useEffect(() => {
    const verifyInvite = async () => {
      if (!token) {
        setError('Invalid invitation link - missing token');
        setIsLoading(false);
        return;
      }

      try {
        const response = await supabase.functions.invoke('verify-admin-invite', {
          body: { token }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const data = response.data;
        
        if (!data.valid) {
          setError(data.error || 'Invalid or expired invitation');
        } else {
          setInviteData(data);
          
          // Apply tenant branding if available
          if (data.metadata) {
            setBranding({
              primaryColor: data.metadata.primaryColor || '#2563eb',
              appName: data.metadata.organizationName || 'KisanShaktiAI',
              logoUrl: data.metadata.appLogo
            });
          }
        }
      } catch (err: any) {
        console.error('Error verifying invite:', err);
        setError(err.message || 'Failed to verify invitation');
      } finally {
        setIsLoading(false);
      }
    };

    verifyInvite();
  }, [token, setBranding]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || !inviteData) return;

    if (!formData.fullName || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await supabase.functions.invoke('verify-admin-invite/accept', {
        method: 'POST',
        body: JSON.stringify({
          token,
          fullName: formData.fullName,
          password: formData.password,
          phone: formData.phone
        })
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      if (result.success) {
        toast.success('Admin account created successfully!');
        
        // Sign in the user automatically
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: inviteData.email,
          password: formData.password
        });

        if (signInError) {
          console.error('Auto sign-in failed:', signInError);
          toast.error('Account created but auto sign-in failed. Please sign in manually.');
          navigate('/auth');
        } else {
          navigate('/super-admin');
        }
      } else {
        throw new Error(result.error || 'Failed to create account');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to create admin account');
      toast.error(err.message || 'Failed to create admin account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getExpiryTimeLeft = () => {
    if (!inviteData?.expiresAt) return '';
    
    const expiryTime = new Date(inviteData.expiresAt);
    const now = new Date();
    const timeLeft = expiryTime.getTime() - now.getTime();
    
    if (timeLeft <= 0) return 'Expired';
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">Verifying invitation...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inviteData || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-800">Access Denied</CardTitle>
            <CardDescription className="text-red-600">
              {error || 'Registration is invite-only. You need a valid invitation link to create an admin account.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                This platform uses secure invite-only registration to protect against unauthorized access.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
              variant="outline"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          {inviteData.metadata?.appLogo && (
            <div className="mx-auto">
              <img 
                src={inviteData.metadata.appLogo} 
                alt={inviteData.metadata.organizationName || 'Organization'} 
                className="h-12 w-auto mx-auto mb-4"
              />
            </div>
          )}
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Complete Your Admin Registration
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Join <strong>{inviteData.metadata?.organizationName || 'KisanShaktiAI'}</strong> as a <strong>{formatRole(inviteData.role)}</strong>
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Invitation Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">Invitation Details</span>
            </div>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-gray-600">Email:</span> 
                <span className="font-medium ml-1">{inviteData.email}</span>
              </div>
              <div>
                <span className="text-gray-600">Role:</span> 
                <span className="font-medium ml-1">{formatRole(inviteData.role)}</span>
              </div>
              <div>
                <span className="text-gray-600">Expires:</span> 
                <span className="font-medium ml-1 text-amber-700">{getExpiryTimeLeft()}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                placeholder="Enter your full name"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Create a strong password"
                  disabled={isSubmitting}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
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

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Complete Registration
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              By completing registration, you agree to our Terms of Service and Privacy Policy.
              This invitation will expire automatically for security.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRegister;
