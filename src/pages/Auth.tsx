
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

  console.log('Auth.tsx: Render state:', { 
    user: user?.id, 
    isLoading, 
    needsBootstrap, 
    checkingBootstrap,
    bootstrapError
  });

  useEffect(() => {
    // Only check bootstrap if we don't have a user or if auth is not loading
    if (!isLoading) {
      checkBootstrapStatus();
    }
  }, [isLoading]);

  const checkBootstrapStatus = async () => {
    try {
      console.log('Auth.tsx: Checking bootstrap status...');
      setBootstrapError(null);
      setCheckingBootstrap(true);
      
      const isCompleted = await authenticationService.isBootstrapCompleted();
      console.log('Auth.tsx: Bootstrap completed:', isCompleted);
      
      setNeedsBootstrap(!isCompleted);
    } catch (error) {
      console.error('Error checking bootstrap status:', error);
      setBootstrapError('Failed to check system status');
      setNeedsBootstrap(false); // Default to normal auth if can't determine
    } finally {
      setCheckingBootstrap(false);
    }
  };

  // If we have an authenticated admin user, redirect immediately
  if (user && isAdmin && !isLoading) {
    console.log('Auth.tsx: Authenticated admin user found, redirecting to super-admin');
    return <Navigate to="/super-admin" replace />;
  }

  // Show loading state while checking auth or bootstrap
  if (isLoading || checkingBootstrap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <div>
            {isLoading ? 'Checking authentication...' : 'Checking system status...'}
          </div>
          {bootstrapError && (
            <div className="text-red-600 text-sm mt-2">{bootstrapError}</div>
          )}
        </div>
      </div>
    );
  }

  // Show bootstrap setup if system needs initialization (only if no authenticated user)
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
