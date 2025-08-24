
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';
import { BootstrapSetup } from '@/components/auth/BootstrapSetup';
import { authenticationService } from '@/services/AuthenticationService';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Auth() {
  const { user, isLoading, isAdmin } = useAuth();
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [checkingBootstrap, setCheckingBootstrap] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  console.log('Auth.tsx: Render state:', { 
    user: user?.id, 
    isLoading, 
    isAdmin,
    needsBootstrap, 
    checkingBootstrap,
    bootstrapError,
    retryCount
  });

  // Redirect authenticated admin users immediately
  if (user && isAdmin && !isLoading) {
    console.log('Auth.tsx: Redirecting authenticated admin user to super-admin');
    return <Navigate to="/super-admin" replace />;
  }

  useEffect(() => {
    checkBootstrapStatus();
  }, []); // Only run once on mount

  const checkBootstrapStatus = async () => {
    try {
      console.log('Auth.tsx: Starting comprehensive bootstrap status check...');
      setBootstrapError(null);
      setCheckingBootstrap(true);
      
      // Use the improved bootstrap check from AuthenticationService
      const isCompleted = await authenticationService.isBootstrapCompleted();
      console.log('Auth.tsx: Bootstrap completed (from service):', isCompleted);
      
      setNeedsBootstrap(!isCompleted);
      setRetryCount(0); // Reset retry count on successful check
    } catch (error) {
      console.error('Auth.tsx: Error checking bootstrap status:', error);
      setBootstrapError(
        retryCount >= 2 
          ? 'Unable to connect to the system. Please check your connection and try again.'
          : 'Failed to check system status. Retrying...'
      );
      // Auto-retry up to 3 times
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          checkBootstrapStatus();
        }, 2000 * (retryCount + 1)); // Exponential backoff
      } else {
        setNeedsBootstrap(true); // Default to showing bootstrap if we can't determine status
      }
    } finally {
      setCheckingBootstrap(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    checkBootstrapStatus();
  };

  // Show loading state while checking auth or bootstrap
  if (isLoading || checkingBootstrap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary mr-2" />
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <div className="text-lg font-semibold mb-2 text-foreground">
              {isLoading ? 'Initializing Authentication' : 'Checking System Status'}
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              {isLoading 
                ? 'Setting up secure connection...' 
                : 'Verifying system configuration...'
              }
            </div>
            {bootstrapError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive mr-2" />
                  <span className="text-sm font-medium text-destructive">Connection Issue</span>
                </div>
                <p className="text-xs text-destructive/80 mb-3">{bootstrapError}</p>
                {retryCount >= 2 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRetry}
                    className="w-full"
                  >
                    Retry Connection
                  </Button>
                )}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-4">
              Powered by Advanced Security Architecture
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show bootstrap setup if system needs initialization and no authenticated user
  if (needsBootstrap && !user) {
    console.log('Auth.tsx: Showing bootstrap setup');
    return <BootstrapSetup onBootstrapComplete={checkBootstrapStatus} />;
  }

  // Show normal admin auth for non-authenticated users when bootstrap is complete
  console.log('Auth.tsx: Showing super admin auth form');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <SuperAdminAuth />
    </div>
  );
}
