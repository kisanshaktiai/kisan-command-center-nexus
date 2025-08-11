
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Mail, 
  Phone, 
  Users, 
  Database,
  UserPlus,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TenantDetailsCompactProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TenantDetailsCompact: React.FC<TenantDetailsCompactProps> = ({
  tenant,
  isOpen,
  onClose,
}) => {
  const [userStatus, setUserStatus] = useState<'checking' | 'found' | 'not_found' | 'registering' | 'registered'>('checking');
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (tenant && isOpen) {
      checkUserExists();
    }
  }, [tenant, isOpen]);

  const checkUserExists = async () => {
    if (!tenant?.owner_email) {
      setUserStatus('not_found');
      return;
    }

    try {
      setUserStatus('checking');
      
      // Check if user exists in auth.users
      const { data: users, error } = await supabase.auth.admin.listUsers();
      
      if (error) {
        console.error('Error checking users:', error);
        setUserStatus('not_found');
        return;
      }

      const existingUser = users.users?.find(user => user.email === tenant.owner_email);
      
      if (existingUser) {
        setUserId(existingUser.id);
        setUserEmail(existingUser.email);
        setUserStatus('found');
      } else {
        setUserStatus('not_found');
      }
    } catch (error) {
      console.error('Error checking user existence:', error);
      setUserStatus('not_found');
    }
  };

  const handleRegisterUser = async () => {
    if (!tenant?.owner_email || !tenant?.owner_name) {
      toast.error('Missing required information for user registration');
      return;
    }

    try {
      setUserStatus('registering');

      const { data, error } = await supabase.functions.invoke('register-user-with-welcome', {
        body: {
          email: tenant.owner_email,
          fullName: tenant.owner_name,
          tenantId: tenant.id,
          sendWelcomeEmail: true,
          welcomeEmailData: {
            tenantName: tenant.name,
            loginUrl: `${window.location.origin}/auth`,
            customMessage: `Welcome to ${tenant.name}! Your tenant account has been activated.`
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setUserId(data.userId);
        setUserEmail(data.email);
        setUserStatus('registered');
        toast.success('User registered successfully and welcome email sent!');
        
        // Optionally update tenant status to active if it was trial
        if (tenant.status === 'trial') {
          // You might want to call a function to update tenant status here
        }
      } else {
        throw new Error(data?.error || 'Failed to register user');
      }
    } catch (error) {
      console.error('Error registering user:', error);
      setUserStatus('not_found');
      toast.error('Failed to register user: ' + (error as Error).message);
    }
  };

  if (!tenant) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'trial': return 'bg-blue-500';
      case 'suspended': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSubscriptionBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'AI_Enterprise': return 'default';
      case 'Shakti_Growth': return 'secondary';
      case 'Kisan_Basic': return 'outline';
      default: return 'outline';
    }
  };

  const getUserStatusIcon = () => {
    switch (userStatus) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'found':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'registered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'registering':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'not_found':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <DialogTitle className="text-lg font-semibold">
                {tenant.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(tenant.status)}`} />
                <span className="text-sm text-muted-foreground capitalize">
                  {tenant.status}
                </span>
                <Badge variant={getSubscriptionBadgeVariant(tenant.subscription_plan)} className="text-xs">
                  {tenant.subscription_plan.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Owner Information */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Owner Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{tenant.owner_name || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{tenant.owner_email || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <p className="font-medium">{tenant.owner_phone || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">User Status:</span>
                <div className="flex items-center gap-2">
                  {getUserStatusIcon()}
                  <span className="font-medium capitalize">
                    {userStatus === 'found' ? 'Registered' : 
                     userStatus === 'registered' ? 'Just Registered' :
                     userStatus === 'not_found' ? 'Not Registered' :
                     userStatus === 'checking' ? 'Checking...' :
                     'Registering...'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* User ID Display */}
            {(userStatus === 'found' || userStatus === 'registered') && userId && (
              <div className="mt-3 p-2 bg-muted/50 rounded-md">
                <span className="text-sm text-muted-foreground">User ID:</span>
                <p className="font-mono text-xs break-all">{userId}</p>
              </div>
            )}

            {/* Register User Button */}
            {userStatus === 'not_found' && tenant.owner_email && (
              <div className="mt-3">
                <Button 
                  onClick={handleRegisterUser}
                  size="sm"
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register User & Send Welcome Email
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Limits Overview */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Plan Limits
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Farmers:</span>
                <p className="font-bold">{tenant.max_farmers?.toLocaleString() || 'Unlimited'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Dealers:</span>
                <p className="font-bold">{tenant.max_dealers?.toLocaleString() || 'Unlimited'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Storage:</span>
                <p className="font-bold">{tenant.max_storage_gb || 'Unlimited'} GB</p>
              </div>
              <div>
                <span className="text-muted-foreground">API Calls/Day:</span>
                <p className="font-bold">{tenant.max_api_calls_per_day?.toLocaleString() || 'Unlimited'}</p>
              </div>
            </div>
          </div>

          {/* Domain Info */}
          {(tenant.subdomain || tenant.custom_domain) && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium mb-3">Domain Configuration</h3>
                <div className="space-y-2 text-sm">
                  {tenant.subdomain && (
                    <div>
                      <span className="text-muted-foreground">Subdomain:</span>
                      <p className="font-mono bg-muted px-2 py-1 rounded text-xs">
                        {tenant.subdomain}
                      </p>
                    </div>
                  )}
                  {tenant.custom_domain && (
                    <div>
                      <span className="text-muted-foreground">Custom Domain:</span>
                      <p className="font-mono bg-muted px-2 py-1 rounded text-xs">
                        {tenant.custom_domain}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
