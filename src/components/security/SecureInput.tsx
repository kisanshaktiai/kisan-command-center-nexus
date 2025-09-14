
import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EnhancedSecurityUtils } from '@/utils/enhancedSecurity';
import { AlertTriangle, Shield } from 'lucide-react';

interface SecureInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSecureChange?: (value: string, isValid: boolean) => void;
  validateInput?: boolean;
  showSecurityIndicator?: boolean;
  maxLength?: number;
}

export const SecureInput: React.FC<SecureInputProps> = ({
  onSecureChange,
  validateInput = true,
  showSecurityIndicator = false,
  maxLength = 1000,
  onChange,
  ...props
}) => {
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [isSecure, setIsSecure] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    let sanitizedValue = rawValue;
    let valid = true;
    
    if (validateInput) {
      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce security validation
      debounceRef.current = setTimeout(() => {
        // Check for potential XSS or injection attempts
        const dangerousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i,
          /<iframe/i,
          /<object/i,
          /<embed/i,
          /data:text\/html/i
        ];

        const hasDangerousContent = dangerousPatterns.some(pattern => 
          pattern.test(rawValue)
        );

        if (hasDangerousContent) {
          setSecurityWarning('Input contains potentially dangerous content');
          setIsSecure(false);
          valid = false;
        } else if (rawValue.length > maxLength) {
          setSecurityWarning(`Input exceeds maximum length of ${maxLength} characters`);
          setIsSecure(false);
          valid = false;
        } else {
          setSecurityWarning(null);
          setIsSecure(true);
        }

        // Sanitize the input
        sanitizedValue = EnhancedSecurityUtils.sanitizeInput(rawValue);
        
        // Update the input value if it was sanitized
        if (sanitizedValue !== rawValue && e.target) {
          e.target.value = sanitizedValue;
        }

        onSecureChange?.(sanitizedValue, valid);
      }, 300);
    }

    // Call original onChange
    onChange?.(e);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          {...props}
          onChange={handleChange}
          className={`${props.className || ''} ${
            !isSecure ? 'border-destructive focus:border-destructive' : ''
          }`}
        />
        {showSecurityIndicator && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isSecure ? (
              <Shield className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
          </div>
        )}
      </div>
      
      {securityWarning && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {securityWarning}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
