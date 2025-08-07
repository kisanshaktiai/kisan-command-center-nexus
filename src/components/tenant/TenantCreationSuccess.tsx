
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, User, Building, Copy, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TenantCreationSuccessProps {
  tenantName: string;
  adminEmail: string;
  hasEmailSent: boolean;
  onClose: () => void;
}

export const TenantCreationSuccess: React.FC<TenantCreationSuccessProps> = ({
  tenantName,
  adminEmail,
  hasEmailSent,
  onClose
}) => {
  const copyEmail = () => {
    navigator.clipboard.writeText(adminEmail);
  };

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <CheckCircle className="w-6 h-6 text-green-600" />
          Tenant Created Successfully!
        </CardTitle>
        <CardDescription className="text-green-700">
          The tenant organization has been set up and the admin account is ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
            <Building className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Tenant Organization</p>
              <p className="text-sm text-green-700">{tenantName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
            <User className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="font-medium text-green-900">Administrator</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-green-700">{adminEmail}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyEmail}
                  className="h-6 w-6 p-0 hover:bg-green-100"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {hasEmailSent ? (
          <Alert className="border-green-200 bg-green-50">
            <Mail className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Welcome email sent successfully!</strong> The administrator will receive:
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Login credentials with temporary password</li>
                <li>• Direct login link to the platform</li>
                <li>• Account activation instructions</li>
                <li>• Password reset options for security</li>
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-amber-200 bg-amber-50">
            <Mail className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Email delivery failed.</strong> Please manually share the login credentials with the administrator.
              The tenant account has been created successfully.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={onClose} className="flex-1">
            Continue Managing Tenants
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            View Tenant
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
