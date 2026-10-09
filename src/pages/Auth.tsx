import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';
import { Loader2, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function Auth() {
  const { user, isLoading, isAdmin } = useAuth();

  useEffect(() => {
    console.log('Auth.tsx: Admin authentication page initialized');
  }, []);

  // Existing authenticated admins must never be sent through bootstrap/registration.
  if (user && isAdmin && !isLoading) {
    return <Navigate to="/super-admin" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Normal production flow: existing Super Admin/Admin signs in here.
  // First-installation bootstrap is intentionally NOT part of the normal login route.
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
