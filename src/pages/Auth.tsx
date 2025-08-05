
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';
import { BootstrapSetup } from '@/components/auth/BootstrapSetup';
import { authenticationService } from '@/services/AuthenticationService';
import { Loader2 } from 'lucide-react';

export default function Auth() {
  const { user, isLoading, isAdmin } = useAuth();
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [checkingBootstrap, setCheckingBootstrap] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);

  console.log('Auth.tsx: Render state:', { 
    user: user?.id, 
    isLoading, 
    isAdmin,
    needsBootstrap, 
    checkingBootstrap,
    bootstrapError,
    hasRedirected
  });

  // Prevent infinite redirect loops
  useEffect(() => {
    if (user && isAdmin && !isLoading && !hasRedirected) {
      console.log('Auth.tsx: Setting redirect flag for authenticated admin');
      setHasRedirected(true);
    }
  }, [user, isAdmin, isLoading, hasRedirected]);

  useEffect(() => {
    // Only check bootstrap if we don't have a user and auth is not loading
    if (!isLoading && !user) {
      checkBootstrapStatus();
    } else if (!isLoading && user) {
      // User is authenticated, no need to check bootstrap
      setCheckingBootstrap(false);
    }
  }, [isLoading, user]);

  const checkBootstrapStatus = async () => {
    try {
      console.log('Auth.tsx: Checking bootstrap status...');
      setBootstrapError(null);
      setCheckingBootstrap(true);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Bootstrap check timeout')), 8000);
      });

      const bootstrapPromise = authenticationService.isBootstrapCompleted();
      
      const isCompleted = await Promise.race([bootstrapPromise, timeoutPromise]) as boolean;
      console.log('Auth.tsx: Bootstrap completed:', isCompleted);
      
      setNeedsBootstrap(!isCompleted);
    } catch (error) {
      console.error('Auth.tsx: Error checking bootstrap status:', error);
      setBootstrapError('Failed to check system status. Using default authentication.');
      setNeedsBootstrap(false); // Default to normal auth if can't determine
    } finally {
      setCheckingBootstrap(false);
    }
  };

  // Redirect authenticated admin users
  if (user && isAdmin && !isLoading && hasRedirected) {
    console.log('Auth.tsx: Redirecting authenticated admin user to super-admin');
    return <Navigate to="/super-admin" replace />;
  }

  // Show loading state while checking auth or bootstrap
  if (isLoading || checkingBootstrap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="text-center max-w-md mx-auto p-8">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <div className="text-lg font-medium mb-2">
            {isLoading ? 'Initializing authentication...' : 'Checking system status...'}
          </div>
          {bootstrapError && (
            <div className="text-red-600 text-sm mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              {bootstrapError}
            </div>
          )}
          <div className="text-sm text-muted-foreground mt-4">
            This may take a few moments
          </div>
        </div>
      </div>
    );
  }

  // Show bootstrap setup if system needs initialization and no authenticated user
  if (needsBootstrap && !user) {
    console.log('Auth.tsx: Showing bootstrap setup');
    return <BootstrapSetup />;
  }

  // Show normal admin auth for non-authenticated users when bootstrap is complete
  console.log('Auth.tsx: Showing super admin auth form');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <SuperAdminAuth />
    </div>
  );
}
