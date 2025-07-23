
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertCircle, Lock } from 'lucide-react';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { toast } from 'sonner';

interface SuperAdminAuthProps {
  autocomplete?: string;
}

export const SuperAdminAuth: React.FC<SuperAdminAuthProps> = ({ autocomplete = "off" }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountLocked, setAccountLocked] = useState(false);
  
  const { signIn } = useEnhancedAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setAccountLocked(false);

    try {
      const { data, error } = await signIn(email, password);
      
      if (error) {
        if (error.message.includes('temporarily locked')) {
          setAccountLocked(true);
          setError(error.message);
        } else {
          setError(error.message || 'Login failed. Please check your credentials.');
        }
        return;
      }

      if (data?.user) {
        toast.success('Login successful!');
        navigate('/super-admin');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Super Admin Access</CardTitle>
            <CardDescription className="text-muted-foreground">
              Secure platform administration portal
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <Alert variant={accountLocked ? "destructive" : "default"} className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">
                  {accountLocked && <Lock className="inline w-4 h-4 mr-1" />}
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete={autocomplete}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 bg-white border-gray-200 focus:border-primary focus:ring-primary"
                  placeholder="admin@example.com"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 bg-white border-gray-200 focus:border-primary focus:ring-primary"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              <p>Secure admin access only</p>
              <p className="text-xs mt-1">
                Account will be locked after 5 failed attempts
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
