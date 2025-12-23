import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface InviteData {
  email: string;
  role: string;
  tenant_name?: string;
  inviter_name?: string;
  expiresAt: string;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isVerifying, setIsVerifying] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setError('Invalid invitation link');
      setIsVerifying(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      setIsVerifying(true);
      setError(null);

      const { data, error: verifyError } = await supabase.functions.invoke('user-invitations', {
        body: {
          action: 'verify',
          invitation_type: 'user',
          token
        }
      });

      if (verifyError) throw verifyError;

      if (!data.valid) {
        throw new Error(data.error || 'Invalid invitation');
      }

      setInviteData({
        email: data.email,
        role: data.role,
        tenant_name: data.metadata?.tenant_name,
        inviter_name: data.metadata?.inviter_name,
        expiresAt: data.expiresAt
      });
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to verify invitation');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const { data, error: acceptError } = await supabase.functions.invoke('user-invitations', {
        body: {
          action: 'accept',
          invitation_type: 'user',
          token,
          fullName: formData.fullName,
          password: formData.password,
          phone: formData.phone
        }
      });

      if (acceptError) throw acceptError;

      if (!data.success) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/auth?message=Account created successfully. Please log in.');
      }, 2000);

    } catch (err: any) {
      console.error('Accept invitation error:', err);
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Welcome aboard!</h2>
            <p className="text-muted-foreground text-center mb-4">
              Your account has been created successfully.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to login...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground text-center mb-6">
              {error}
            </p>
            <Button onClick={() => navigate('/auth')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Accept Invitation</CardTitle>
          <CardDescription>
            You've been invited to join {inviteData?.tenant_name || 'the organization'}
            {inviteData?.inviter_name && ` by ${inviteData.inviter_name}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mb-6 p-4 bg-secondary/50 rounded-lg">
            <div className="text-sm">
              <p className="font-medium mb-1">Email:</p>
              <p className="text-muted-foreground">{inviteData?.email}</p>
            </div>
            <div className="text-sm mt-2">
              <p className="font-medium mb-1">Role:</p>
              <p className="text-muted-foreground capitalize">
                {inviteData?.role.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="John Doe"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 234 567 8900"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Minimum 8 characters"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Re-enter your password"
                required
                disabled={isSubmitting}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Accept Invitation & Create Account'
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            By accepting, you agree to create an account with the provided email
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
