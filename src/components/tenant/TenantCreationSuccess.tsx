
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Mail, Copy, X, Shield, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TenantCreationSuccessProps {
  tenantName: string;
  adminEmail: string;
  hasEmailSent: boolean;
  correlationId?: string;
  warnings?: string[];
  onClose: () => void;
}

export const TenantCreationSuccess: React.FC<TenantCreationSuccessProps> = ({
  tenantName,
  adminEmail,
  hasEmailSent,
  correlationId,
  warnings = [],
  onClose
}) => {
  const { toast } = useToast();

  const copyCorrelationId = () => {
    if (correlationId) {
      navigator.clipboard.writeText(correlationId);
      toast({
        title: "Copied",
        description: "Correlation ID copied to clipboard",
        variant: "default",
      });
    }
  };

  const copyAdminEmail = () => {
    navigator.clipboard.writeText(adminEmail);
    toast({
      title: "Copied",
      description: "Admin email copied to clipboard",
      variant: "default",
    });
  };

  return (
    <Alert className="mb-6 border-green-200 bg-green-50">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <AlertDescription className="text-green-800">
                <div className="font-semibold text-base mb-2">
                  🎉 Tenant "{tenantName}" created successfully!
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Admin email:</span>
                    <code className="bg-green-100 px-2 py-1 rounded text-green-800 font-mono">
                      {adminEmail}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyAdminEmail}
                      className="h-6 w-6 p-0 hover:bg-green-200"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>

                  {correlationId && (
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>Reference ID:</span>
                      <code className="bg-green-100 px-2 py-1 rounded text-green-800 font-mono text-xs">
                        {correlationId}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyCorrelationId}
                        className="h-6 w-6 p-0 hover:bg-green-200"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </div>

            {/* Email Status */}
            <div className="border-t border-green-200 pt-3">
              <div className="flex items-center space-x-2 mb-2">
                {hasEmailSent ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-700 font-medium">Welcome email sent successfully</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-700 font-medium">Email delivery issue</span>
                  </>
                )}
              </div>
              
              <div className="text-sm text-green-700">
                {hasEmailSent ? (
                  <p>
                    📧 The admin user has been sent login credentials via email. 
                    They can use these to access their new tenant dashboard.
                  </p>
                ) : (
                  <p>
                    ⚠️ Tenant was created successfully, but the welcome email could not be delivered. 
                    Please verify your email configuration and manually provide login details to the admin.
                  </p>
                )}
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="border-t border-green-200 pt-3">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-700 font-medium">Notices</span>
                </div>
                <ul className="space-y-1 text-sm text-amber-700">
                  {warnings.map((warning, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-amber-600 mt-0.5">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Security Information */}
            <div className="border-t border-green-200 pt-3">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-green-700 font-medium">Security & Next Steps</span>
              </div>
              <ul className="space-y-1 text-sm text-green-700">
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Tenant created with enhanced security validation</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Admin user account configured with secure credentials</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>All actions logged for audit and security monitoring</span>
                </li>
                {hasEmailSent && (
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600 mt-0.5">⚠️</span>
                    <span className="text-amber-700">
                      Admin should change their temporary password on first login
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {/* Timestamp */}
            <div className="border-t border-green-200 pt-2">
              <div className="flex items-center space-x-2 text-xs text-green-600">
                <Clock className="h-3 w-3" />
                <span>Created at: {new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0 hover:bg-green-200 flex-shrink-0 ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};
