
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PasswordStrength, validatePassword } from '@/components/ui/password-strength';
import { Loader2, Shield, Eye, EyeOff, UserPlus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AdminRegistrationProps {
  onToggleMode: () => void;
}

export const AdminRegistration: React.FC<AdminRegistrationProps> = ({ onToggleMode }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const roles = [
    { 
      value: 'admin', 
      label: 'Admin', 
      description: 'Basic administrative access' 
    },
    { 
      value: 'platform_admin', 
      label: 'Platform Admin', 
      description: 'Advanced platform management capabilities' 
    },
    { 
      value: 'super_admin', 
      label: 'Super Admin', 
      description: 'Full system access and control' 
    }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const assignAdminRole = async (userId: string, retryAttempt = 0) => {
    const maxRetries = 3;
    
    try {
      const response = await fetch('https://qfklkkzxemsbeniyugiz.supabase.co/functions/v1/assign-admin-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFma2xra3p4ZW1zYmVuaXl1Z2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MjcxNjUsImV4cCI6MjA2ODAwMzE2NX0.dUnGp7wbwYom1FPbn_4EGf3PWjgmr8mXwL2w2SdYOh4'
        },
        body: JSON.stringify({
          userId: userId,
          email: formData.email,
          fullName: formData.fullName,
          role: formData.role
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Role assignment error:', errorData);
        
        // Handle specific error codes
        if (errorData.code === 'ALREADY_ADMIN') {
          toast.success('Admin registration successful! Role was already assigned.');
          return true;
        }
        
        if (errorData.code === 'INVALID_ROLE') {
          throw new Error('Invalid role selected. Please try again.');
        }
        
        if (errorData.code === 'MISSING_FIELDS') {
          throw new Error('Missing required information. Please check your form.');
        }
        
        // Retry for transient errors
        if (retryAttempt < maxRetries && (errorData.code === 'INTERNAL_ERROR' || response.status >= 500)) {
          console.log(`Retrying role assignment (attempt ${retryAttempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryAttempt + 1))); // Exponential backoff
          return assignAdminRole(userId, retryAttempt + 1);
        }
        
        throw new Error(errorData.error || 'Failed to assign admin role');
      }

      const result = await response.json();
      console.log('Role assignment successful:', result);
      return true;
      
    } catch (error) {
      console.error('Role assignment failed:', error);
      if (retryAttempt < maxRetries) {
        console.log(`Retrying role assignment (attempt ${retryAttempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryAttempt + 1)));
        return assignAdminRole(userId, retryAttempt + 1);
      }
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.fullName || !formData.role) {
      setError('Please fill in all required fields');
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('Starting admin registration process...');
      
      const { data, error } = await signUp(formData.email, formData.password, {
        organizationName: 'Admin Organization',
        organizationType: 'admin',
        fullName: formData.fullName,
        phone: '',
        tenantId: undefined
      });

      if (error) {
        console.error('Supabase signup error:', error);
        throw error;
      }

      if (data.user) {
        console.log('User created successfully, assigning admin role...');
        
        try {
          await assignAdminRole(data.user.id);
          toast.success('Admin registration successful! Please check your email for verification.');
          
          // Reset form on success
          setFormData({ email: '', password: '', fullName: '', role: '' });
          setRetryCount(0);
          
        } catch (roleError) {
          console.error('Role assignment failed:', roleError);
          toast.error(`Registration successful but role assignment failed: ${roleError.message}`);
          setError(`Account created but role assignment failed: ${roleError.message}`);
        }
      } else {
        throw new Error('User creation failed - no user data returned');
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <UserPlus className="w-6 h-6 text-primary" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">Admin Registration</CardTitle>
          <CardDescription>
            Create a new admin account with role assignment
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
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
              placeholder="admin@example.com"
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Admin Role</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select admin role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{role.label}</span>
                      <span className="text-sm text-muted-foreground">{role.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Admin Account...
              </>
            ) : (
              'Create Admin Account'
            )}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={onToggleMode}
              className="text-sm"
            >
              Already have an account? Sign in
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
