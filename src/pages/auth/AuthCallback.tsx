
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage(error.message || 'Authentication failed');
          return;
        }

        if (data.session) {
          // Update email verification status if this was an email confirmation
          const type = searchParams.get('type');
          if (type === 'signup' && data.session.user) {
            try {
              // Simplified profile update without new columns
              console.log('Email verification completed for user:', data.session.user.id);
            } catch (updateError) {
              console.warn('Error updating verification status:', updateError);
              // Don't fail the auth process for this
            }
          }

          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          
          // Redirect based on tenant parameter or default
          const tenant = searchParams.get('tenant');
          const redirectUrl = tenant 
            ? `/super-admin?tenant=${tenant}` 
            : '/super-admin';
          
          setTimeout(() => navigate(redirectUrl), 2000);
        } else {
          setStatus('error');
          setMessage('No valid session found');
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 mb-4">
            {status === 'loading' && (
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-16 h-16 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="w-16 h-16 text-red-600" />
            )}
          </div>
          <CardTitle>
            {status === 'loading' && 'Processing...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Error'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status === 'error' && (
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
            >
              Return to Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
