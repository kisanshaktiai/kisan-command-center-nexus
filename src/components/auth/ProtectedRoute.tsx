
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
    console.log('User email:', user.email);
    console.log('isAdmin from context:', isAdmin);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <div className="space-y-4">
              <div className="text-red-600 text-6xl">🚫</div>
              <h2 className="text-2xl font-bold text-red-800">Access Denied</h2>
              <p className="text-red-600">
                You do not have administrator privileges to access this area.
              </p>
              <p className="text-sm text-red-500">
                If you believe this is an error, please contact your system administrator.
              </p>
              <div className="pt-4">
                <button 
                  onClick={() => window.location.href = '/auth'}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Return to Login
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log('ProtectedRoute: Access granted for user:', user.email, 'Admin status:', isAdmin);
  return <>{children}</>;
};
