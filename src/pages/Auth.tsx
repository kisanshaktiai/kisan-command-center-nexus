
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';
import { BootstrapSetup } from '@/components/auth/BootstrapSetup';
import { authService } from '@/auth/AuthService';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Auth() {
  const { user, isLoading, isAdmin } = useAuth();
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [checkingBootstrap, setCheckingBootstrap] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  console.log('Auth.tsx: Render state:', { 
    user: user?.id, 
    isLoading, 
    isAdmin,
    needsBootstrap, 
    checkingBootstrap,
    bootstrapError
  });

  // Check bootstrap status
  useEffect(() => {
    checkBootstrapStatus();
  }, []);

  const checkBootstrapStatus = async () => {
    try {
      console.log('Auth.tsx: Checking bootstrap status...');
      setBootstrapError(null);
      setCheckingBootstrap(true);
      
      const isNeeded = await authService.isBootstrapNeeded();
      console.log('Auth.tsx: Bootstrap needed:', isNeeded);
      
      setNeedsBootstrap(isNeeded);
    } catch (error) {
      console.error('Auth.tsx: Bootstrap check error:', error);
      setBootstrapError('Failed to check system status');
      setNeedsBootstrap(true); // Default to showing bootstrap on error
    } finally {
      setCheckingBootstrap(false);
    }
  };

  // Redirect authenticated admin users
  if (user && isAdmin && !isLoading) {
    console.log('Auth.tsx: Redirecting authenticated admin user');
    return <Navigate to="/super-admin" replace />;
  }

  // Show loading state
  if (isLoading || checkingBootstrap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              {isLoading ? 'Loading authentication...' : 'Checking system status...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (bootstrapError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-8 h-8 text-destructive mb-4" />
            <p className="text-destructive text-center mb-4">{bootstrapError}</p>
            <Button onClick={checkBootstrapStatus} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show bootstrap setup if needed
  if (needsBootstrap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <BootstrapSetup onComplete={() => setNeedsBootstrap(false)} />
      </div>
    );
  }

  // Show admin login
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Admin Portal</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to access the administration panel
          </p>
        </div>
        <SuperAdminAuth />
      </div>
    </div>
  );
}
