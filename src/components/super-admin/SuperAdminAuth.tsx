
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuthenticationService } from '@/hooks/useAuthenticationService';
import { AuthErrorBoundary } from '../auth/AuthErrorBoundary';

interface SuperAdminAuthProps {
  onToggleMode?: () => void;
}

export const SuperAdminAuth: React.FC<SuperAdminAuthProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { signInAdmin, isLoading, error, clearError } = useAuthenticationService();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      return;
    }

    console.log('SuperAdminAuth: Attempting admin login...');
    clearError();
    
    // The signInAdmin will now handle global state updates and navigation will be handled by Auth.tsx
    await signInAdmin(
      email,
      password,
      (authState) => {
        console.log('SuperAdminAuth: Login successful, auth state:', authState);
        // Don't navigate here - let Auth.tsx handle the redirect
      },
      (error) => {
        console.error('SuperAdminAuth: Login failed:', error);
      }
    );
  };

  return (
    <AuthErrorBoundary>
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

            {onToggleMode && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={onToggleMode}
                  className="text-sm"
                >
                  Need to create an admin account? Register here
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </AuthErrorBoundary>
  );
};
