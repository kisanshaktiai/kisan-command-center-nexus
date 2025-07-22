
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false 
}) => {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Verifying authentication...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && !isAdmin) {
    console.log('ProtectedRoute: Admin access required but user is not admin.');
    console.log('User role from metadata:', user.user_metadata?.role || user.app_metadata?.role);
    console.log('isAdmin from context:', isAdmin);
    
    // For admin routes, redirect back to auth for re-verification
    console.log('Redirecting to auth for admin verification');
    return <Navigate to="/auth" replace />;
  }

  console.log('ProtectedRoute: Access granted for user:', user.email, 'Admin status:', isAdmin);
  return <>{children}</>;
};
