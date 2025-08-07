
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, AlertCircle } from 'lucide-react';
import { useManualEmail } from '@/hooks/useManualEmail';
import { Tenant } from '@/types/tenant';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TenantEmailActionsProps {
  tenant: Tenant;
}

export const TenantEmailActions: React.FC<TenantEmailActionsProps> = ({ tenant }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [emailType, setEmailType] = useState<'password_reset' | 'welcome_resend'>('password_reset');
  const [adminEmail, setAdminEmail] = useState(tenant.owner_email || '');
  const [adminName, setAdminName] = useState(tenant.owner_name || '');
  
  const { loading, error, sendPasswordReset, resendWelcomeEmail, clearError } = useManualEmail();

  const handleSendEmail = async () => {
    if (!adminEmail.trim()) {
      return;
    }

    const request = {
      tenantId: tenant.id,
      emailType,
      adminEmail: adminEmail.trim(),
      adminName: adminName.trim() || undefined
    };

    let success = false;
    
    if (emailType === 'password_reset') {
      success = await sendPasswordReset(request);
    } else {
      success = await resendWelcomeEmail(request);
    }

    if (success) {
      setIsDialogOpen(false);
      // Reset form
      setEmailType('password_reset');
      setAdminEmail(tenant.owner_email || '');
      setAdminName(tenant.owner_name || '');
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      clearError();
      // Reset form when closing
      setEmailType('password_reset');
      setAdminEmail(tenant.owner_email || '');
      setAdminName(tenant.owner_name || '');
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="h-4 w-4 mr-2" />
          Send Email
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Manual Email</DialogTitle>
          <DialogDescription>
            Send a manual email to the tenant administrator for {tenant.name}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="emailType">Email Type</Label>
            <Select 
              value={emailType} 
              onValueChange={(value: 'password_reset' | 'welcome_resend') => setEmailType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select email type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="password_reset">Password Reset</SelectItem>
                <SelectItem value="welcome_resend">Resend Welcome Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminEmail">Admin Email</Label>
            <Input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="Enter admin email address"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminName">Admin Name (Optional)</Label>
            <Input
              id="adminName"
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Enter admin name"
            />
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">
              {emailType === 'password_reset' ? 'Password Reset' : 'Welcome Email'}
            </h4>
            <p className="text-sm text-muted-foreground">
              {emailType === 'password_reset' 
                ? 'Sends a secure password reset link to the admin email address.'
                : 'Resends the welcome email with new login credentials and setup instructions.'
              }
            </p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => handleDialogClose(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmail}
              disabled={loading || !adminEmail.trim()}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
