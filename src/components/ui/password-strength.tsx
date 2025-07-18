import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password, className }) => {
  const requirements = [
    {
      label: 'At least 12 characters',
      test: (pwd: string) => pwd.length >= 12,
    },
    {
      label: 'One uppercase letter (A-Z)',
      test: (pwd: string) => /[A-Z]/.test(pwd),
    },
    {
      label: 'One lowercase letter (a-z)',
      test: (pwd: string) => /[a-z]/.test(pwd),
    },
    {
      label: 'One number (0-9)',
      test: (pwd: string) => /[0-9]/.test(pwd),
    },
    {
      label: 'One special character (@#$%&*!)',
      test: (pwd: string) => /[@#$%&*!?.,;:+=\-_~`^|<>()[\]{}\\/"']/.test(pwd),
    },
    {
      label: 'No spaces allowed',
      test: (pwd: string) => !/\s/.test(pwd),
    },
  ];

  const passedRequirements = requirements.filter(req => req.test(password));
  const strengthPercentage = (passedRequirements.length / requirements.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercentage < 50) return 'bg-destructive';
    if (strengthPercentage < 80) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strengthPercentage < 33) return 'Weak';
    if (strengthPercentage < 66) return 'Fair';
    if (strengthPercentage < 100) return 'Good';
    return 'Strong';
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Password Strength</span>
          <span className={cn(
            'font-medium',
            strengthPercentage < 50 ? 'text-destructive' : 
            strengthPercentage < 80 ? 'text-orange-500' : 'text-green-600'
          )}>
            {getStrengthLabel()}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={cn('h-2 rounded-full transition-all duration-300', getStrengthColor())}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>

      {/* Requirements List */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Password Requirements:</p>
        {requirements.map((requirement, index) => {
          const passed = requirement.test(password);
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              {passed ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <X className="w-3 h-3 text-muted-foreground" />
              )}
              <span className={cn(
                'text-sm',
                passed ? 'text-green-600' : 'text-muted-foreground'
              )}>
                {requirement.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (password.length > 64) {
    errors.push('Password must not exceed 64 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[@#$%&*!?.,;:+=\-_~`^|<>()[\]{}\\/"']/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  if (/\s/.test(password)) {
    errors.push('Password cannot contain spaces');
  }

  // Common password blacklist
  const commonPasswords = [
    'password123', 'admin123', 'administrator', 'password1234', 
    'admin1234', 'welcome123', 'qwerty123', 'abc123456', 
    'password@123', 'admin@123', 'kisanshakti123', 'superadmin123'
  ];

  if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
    errors.push('Password contains common patterns that are not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};