
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';
import { Loader2, Shield } from 'lucide-react';

export default function Auth() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [clearingSession, setClearingSession] = useState(true);

  useEffect(() => {
    // Clear any stored form data or autocomplete on initial load
    const clearSessionData = async () => {
      try {
        // Clear any stored form data in session storage
        sessionStorage.clear();
        
        // Clear any form data from local storage that might interfere
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.includes('form') || key.includes('auth') || key.includes('login')
        );
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Small delay to ensure clearing is complete
        setTimeout(() => setClearingSession(false), 200);
      } catch (error) {
        console.error('Error clearing session data:', error);
        setClearingSession(false);
      }
    };
    
    clearSessionData();
  }, []);

  if (isLoading || clearingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-base font-medium">Preparing authentication...</span>
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Setting up secure login environment
          </p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    console.log('User authenticated, redirecting to dashboard:', user.email);
    return <Navigate to="/super-admin" replace />;
  }

  return (
    <div className="min-h-screen">
      <SuperAdminAuth autocomplete="off" />
    </div>
  );
}
