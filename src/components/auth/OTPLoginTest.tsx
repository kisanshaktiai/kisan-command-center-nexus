import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, CheckCircle } from 'lucide-react';

export const OTPLoginTest = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    console.log('Sending OTP to:', email);

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            timestamp: new Date().toISOString()
          }
        }
      });

      console.log('OTP Response:', { data, error });

      if (error) {
        console.error('OTP Error:', error);
        toast.error(`Failed to send OTP: ${error.message}`);
      } else {
        setOtpSent(true);
        toast.success('OTP sent! Check your email and spam folder.');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!email || !otp) {
      toast.error('Please enter both email and OTP');
      return;
    }

    setVerifyLoading(true);
    console.log('Verifying OTP:', { email, otp: otp.substring(0, 2) + '****' });

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });

      console.log('Verify Response:', { data, error });

      if (error) {
        console.error('Verify Error:', error);
        toast.error(`Verification failed: ${error.message}`);
      } else {
        toast.success('Successfully logged in!');
        // Reset form
        setEmail('');
        setOtp('');
        setOtpSent(false);
      }
    } catch (err) {
      console.error('Unexpected verify error:', err);
      toast.error('Unexpected error during verification');
    } finally {
      setVerifyLoading(false);
    }
  };

  const resetForm = () => {
    setOtpSent(false);
    setOtp('');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Mail className="h-5 w-5" />
          OTP Authentication Test
        </CardTitle>
        <CardDescription>
          Test email OTP functionality with current SMTP settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={otpSent}
          />
        </div>

        {!otpSent ? (
          <Button 
            onClick={handleSendOTP} 
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending OTP...
              </>
            ) : (
              'Send OTP'
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              OTP sent to {email}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="otp" className="text-sm font-medium">
                Enter OTP Code
              </label>
              <Input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleVerifyOTP}
                disabled={verifyLoading || !otp}
                className="flex-1"
              >
                {verifyLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={resetForm}
                disabled={verifyLoading}
              >
                Reset
              </Button>
            </div>

            <Button 
              variant="ghost" 
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full text-sm"
            >
              Resend OTP
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Check console for detailed logs</p>
          <p>• Check spam/junk folder if email not received</p>
          <p>• OTP expires in 60 seconds</p>
        </div>
      </CardContent>
    </Card>
  );
};