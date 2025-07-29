
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
          const type = searchParams.get('type');
          
          // Handle bootstrap user email confirmation
          if (type === 'signup' && data.session.user) {
            const registrationToken = data.session.user.user_metadata?.registration_token;
            
            if (registrationToken) {
              try {
                // Check if this is a bootstrap registration
                const { data: regData } = await supabase
                  .from('admin_registrations')
                  .select('*')
                  .eq('registration_token', registrationToken)
                  .eq('registration_type', 'bootstrap')
                  .single();

                if (regData) {
                  console.log('Completing bootstrap setup for user:', data.session.user.id);
                  
                  // Check if admin user already exists
                  const { data: existingAdmin } = await supabase
                    .from('admin_users')
                    .select('id')
                    .eq('id', data.session.user.id)
                    .single();

                  if (!existingAdmin) {
                    // Create admin user record
                    const { error: adminError } = await supabase
                      .from('admin_users')
                      .insert({
                        id: data.session.user.id,
                        email: regData.email,
                        full_name: regData.full_name,
                        role: regData.role,
                        is_active: true
                      });

                    if (adminError) {
                      console.error('Error creating admin user:', adminError);
                      throw new Error('Failed to complete bootstrap setup');
                    }
                  }

                  // Mark registration as completed
                  await supabase
                    .from('admin_registrations')
                    .update({ 
                      status: 'completed', 
                      completed_at: new Date().toISOString() 
                    })
                    .eq('id', regData.id);

                  // Mark bootstrap as completed
                  await supabase
                    .from('system_config')
                    .upsert({ 
                      config_key: 'bootstrap_completed',
                      config_value: 'true',
                      updated_at: new Date().toISOString()
                    });

                  setStatus('success');
                  setMessage('Bootstrap setup completed! Redirecting to login...');
                  
                  // Redirect to auth page for login
                  setTimeout(() => navigate('/auth'), 2000);
                  return;
                }
              } catch (bootstrapError) {
                console.error('Bootstrap completion error:', bootstrapError);
                setStatus('error');
                setMessage('Failed to complete system setup. Please contact support.');
                return;
              }
            }
            
            // Regular signup confirmation
            console.log('Email verification completed for user:', data.session.user.id);
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
