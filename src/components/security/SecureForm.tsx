
import React, { ReactNode } from 'react';
import { useCSRFProtection } from '@/hooks/useCSRFProtection';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface SecureFormProps {
  children: ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>, csrfToken: string) => void;
  className?: string;
}

export const SecureForm: React.FC<SecureFormProps> = ({
  children,
  onSubmit,
  className = ''
}) => {
  const { csrfToken, getCSRFToken, isLoading } = useCSRFProtection();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const token = getCSRFToken();
    if (!token) {
      console.error('CSRF token not available');
      return;
    }
    
    onSubmit(event, token);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-muted-foreground">Initializing security...</div>
      </div>
    );
  }

  if (!csrfToken) {
    return (
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Security token unavailable. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {/* Hidden CSRF token field */}
      <input type="hidden" name="_csrf" value={csrfToken} />
      {children}
    </form>
  );
};
