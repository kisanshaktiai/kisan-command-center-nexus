
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, RefreshCw, Mail, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface OTPVerificationProps {
  email: string;
  onVerifySuccess: () => void;
  onResendOTP: () => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
}

export const OTPVerification: React.FC<OTPVerificationProps> = ({
  email,
  onVerifySuccess,
  onResendOTP,
  onBack,
  isLoading = false
}) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Simulate OTP verification - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock verification logic - in real implementation, verify with backend
      if (otp === '123456') { // Mock valid OTP
        toast.success('OTP verified successfully!');
        onVerifySuccess();
      } else {
        throw new Error('Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    try {
      await onResendOTP();
      setTimeLeft(300); // Reset timer
      setOtp('');
      setError('');
      toast.success('New OTP sent to your email');
    } catch (err: any) {
      toast.error('Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Verify Your Identity</CardTitle>
            <CardDescription>
              Enter the 6-digit code sent to your email
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              We've sent a verification code to <strong>{email}</strong>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP 
                value={otp} 
                onChange={setOtp} 
                maxLength={6}
                disabled={isVerifying || isLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {timeLeft > 0 ? (
                <p>Code expires in {formatTime(timeLeft)}</p>
              ) : (
                <p className="text-destructive">Code has expired</p>
              )}
            </div>

            <Button
              onClick={handleVerifyOTP}
              className="w-full"
              disabled={otp.length !== 6 || isVerifying || isLoading}
            >
              {isVerifying ? 'Verifying...' : 'Verify & Continue'}
            </Button>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={onBack}
                disabled={isVerifying || isResending || isLoading}
              >
                Back to Login
              </Button>
              
              <Button
                variant="outline"
                onClick={handleResendOTP}
                disabled={timeLeft > 240 || isResending || isLoading} // Allow resend after 1 minute
                className="flex items-center gap-2"
              >
                {isResending && <RefreshCw className="h-4 w-4 animate-spin" />}
                Resend Code
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
