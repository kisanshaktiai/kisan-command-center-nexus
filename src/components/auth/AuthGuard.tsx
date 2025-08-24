
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requireAdmin = false, 
  requireSuperAdmin = false 
}) => {
  const { user, isLoading, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary mr-2" />
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <div className="text-lg font-semibold mb-2 text-foreground">
              Verifying Access
            </div>
            <div className="text-sm text-muted-foreground">
              Checking authentication status...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check admin requirements
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check super admin requirements
  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
