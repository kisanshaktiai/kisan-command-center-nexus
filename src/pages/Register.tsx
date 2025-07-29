import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, ExternalLink } from 'lucide-react';

const Register = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    // If there's an invite token, redirect to admin registration
    if (inviteToken) {
      navigate(`/admin-register?invite=${inviteToken}`, { replace: true });
    }
  }, [inviteToken, navigate]);

  // If no invite token, show invite-only message
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Secure Registration
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            This platform uses invite-only registration for enhanced security
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Registration is restricted to invited users only. You need a valid invitation link to create an account.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <strong>Looking to join as an admin?</strong>
              <p>Contact your system administrator to request an invitation.</p>
            </div>
            
            <div className="text-sm text-gray-600">
              <strong>Already have an account?</strong>
              <p>Use the sign-in option below to access your dashboard.</p>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
            >
              Go to Sign In
            </Button>
            
            <Button 
              onClick={() => window.open('mailto:support@kisanshaktiai.in?subject=Admin Access Request', '_blank')} 
              variant="outline"
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Request Admin Access
            </Button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              This security measure helps protect against unauthorized access and ensures platform integrity.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;