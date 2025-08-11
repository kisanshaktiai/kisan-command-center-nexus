
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tenant } from '@/types/tenant';
import { 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  Users, 
  Package, 
  HardDrive, 
  Zap,
  CheckCircle,
  XCircle,
  UserPlus,
  Search,
  Loader2
} from 'lucide-react';

interface TenantDetailsCompactProps {
  tenant: Tenant;
  isOpen: boolean;
  onClose: () => void;
}

type UserStatus = 'checking' | 'found' | 'not_found' | 'registering' | 'registered' | 'error';

export const TenantDetailsCompact: React.FC<TenantDetailsCompactProps> = ({
  tenant,
  isOpen,
  onClose,
}) => {
  const [userStatus, setUserStatus] = useState<UserStatus>('checking');
  const [userId, setUserId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && tenant) {
      checkUserExists();
    }
  }, [isOpen, tenant]);

  const checkUserExists = async () => {
    if (!tenant?.owner_email) {
      setUserStatus('error');
      return;
    }

    setUserStatus('checking');
    
    try {
      const { data, error } = await supabase.functions.invoke('check-user-exists', {
        body: { email: tenant.owner_email }
      });

      if (error) {
        console.error('Error checking user:', error);
        setUserStatus('error');
        toast.error('Failed to check user status');
        return;
      }

      if (data?.exists) {
        setUserStatus('found');
        setUserId(data.user_id);
      } else {
        setUserStatus('not_found');
        setUserId(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setUserStatus('error');
      toast.error('Failed to check user status');
    }
  };

  const createUserAccount = async () => {
    if (!tenant?.owner_email || !tenant?.owner_name) {
      toast.error('Missing user information');
      return;
    }

    setUserStatus('registering');

    try {
      const { data, error } = await supabase.functions.invoke('register-user-with-welcome', {
        body: {
          email: tenant.owner_email,
          full_name: tenant.owner_name,
          tenant_id: tenant.id,
          auto_confirm: true
        }
      });

      if (error) {
        console.error('Error creating user:', error);
        setUserStatus('not_found');
        toast.error('Failed to create user account');
        return;
      }

      setUserStatus('registered');
      setUserId(data?.user_id || null);
      toast.success('User account created successfully');
    } catch (error) {
      console.error('Error creating user:', error);
      setUserStatus('not_found');
      toast.error('Failed to create user account');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'trial': return 'bg-blue-500';
      case 'suspended': return 'bg-yellow-500';
      case 'inactive': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUserStatusIcon = () => {
    switch (userStatus) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />;
      case 'found':
      case 'registered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'not_found':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'registering':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getUserStatusText = () => {
    switch (userStatus) {
      case 'checking':
        return 'Checking user status...';
      case 'found':
        return 'User account exists';
      case 'registered':
        return 'User account created';
      case 'not_found':
        return 'No user account found';
      case 'registering':
        return 'Creating user account...';
      case 'error':
        return 'Error checking user status';
      default:
        return 'Unknown status';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {tenant.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Basic Information
                <Badge className={`${getStatusColor(tenant.status)} text-white`}>
                  {tenant.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Type:</span>
                  <span>{tenant.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Plan:</span>
                  <span>{tenant.subscription_plan}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Owner:</span>
                  <span>{tenant.owner_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span>{tenant.owner_email}</span>
                </div>
                {tenant.owner_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Phone:</span>
                    <span>{tenant.owner_phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Created:</span>
                  <span>{formatDate(tenant.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Authentication Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">User Authentication Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getUserStatusIcon()}
                  <span className="text-sm">{getUserStatusText()}</span>
                  {userId && (
                    <Badge variant="outline" className="text-xs">
                      ID: {userId.slice(0, 8)}...
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={checkUserExists}
                    disabled={userStatus === 'checking'}
                  >
                    <Search className="h-4 w-4 mr-1" />
                    Check Status
                  </Button>
                  {(userStatus === 'not_found' || userStatus === 'error') && (
                    <Button
                      size="sm"
                      onClick={createUserAccount}
                      disabled={userStatus === 'registering'}
                    >
                      {userStatus === 'registering' ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-1" />
                      )}
                      Create User
                    </Button>
                  )}
                </div>
              </div>
              
              {(userStatus === 'found' || userStatus === 'registered') && userId && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    User account is properly set up and linked to this tenant.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Limits & Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resource Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-medium">{tenant.max_farmers?.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Farmers</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Building2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-medium">{tenant.max_dealers?.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Dealers</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <HardDrive className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-medium">{tenant.max_storage_gb}GB</div>
                  <div className="text-xs text-muted-foreground">Storage</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Zap className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-medium">{tenant.max_api_calls_per_day?.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">API Calls/Day</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Details */}
          {tenant.subscription_start_date && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Subscription Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium">Started:</span>
                    <span className="ml-2">{formatDate(tenant.subscription_start_date)}</span>
                  </div>
                  {tenant.subscription_end_date && (
                    <div>
                      <span className="font-medium">Ends:</span>
                      <span className="ml-2">{formatDate(tenant.subscription_end_date)}</span>
                    </div>
                  )}
                  {tenant.trial_ends_at && (
                    <div>
                      <span className="font-medium">Trial Ends:</span>
                      <span className="ml-2">{formatDate(tenant.trial_ends_at)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          {tenant.metadata && Object.keys(tenant.metadata).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {Object.entries(tenant.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-muted-foreground">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
