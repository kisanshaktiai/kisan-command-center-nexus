
import React, { useState, useEffect } from 'react';
import { Tenant } from '@/types/tenant';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard, 
  Building, 
  Users, 
  Package, 
  HardDrive,
  Activity,
  UserPlus,
  KeyRound,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useTenantUserManagement } from '@/hooks/useTenantUserManagement';

interface TenantDetailsModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (tenant: Tenant) => void;
}

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onEdit
}) => {
  const [userStatus, setUserStatus] = useState<'checking' | 'found' | 'not_found' | 'error'>('checking');
  const [userInfo, setUserInfo] = useState<any>(null);
  
  const {
    isCheckingUser,
    isCreatingUser,
    isSendingReset,
    checkUserExists,
    createAdminUser,
    sendPasswordReset
  } = useTenantUserManagement();

  // Check user existence when modal opens with tenant
  useEffect(() => {
    if (tenant?.owner_email && isOpen) {
      checkUser();
    }
  }, [tenant?.owner_email, isOpen]);

  const checkUser = async () => {
    if (!tenant?.owner_email) return;
    
    setUserStatus('checking');
    const result = await checkUserExists(tenant.owner_email);
    
    if (result?.error) {
      setUserStatus('error');
    } else if (result?.userExists) {
      setUserStatus('found');
      setUserInfo(result.user);
    } else {
      setUserStatus('not_found');
      setUserInfo(null);
    }
  };

  const handleCreateUser = async () => {
    if (!tenant?.owner_email || !tenant?.owner_name) return;
    
    const result = await createAdminUser(
      tenant.owner_email, 
      tenant.owner_name, 
      tenant.id
    );
    
    if (result?.success) {
      // Refresh user status after successful creation
      setTimeout(() => checkUser(), 1000);
    }
  };

  const handleSendReset = async () => {
    if (!tenant?.owner_email) return;
    await sendPasswordReset(tenant.owner_email);
  };

  if (!tenant) return null;

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      trial: 'secondary', 
      suspended: 'destructive',
      cancelled: 'outline',
      archived: 'outline'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const UserStatusSection = () => {
    if (!tenant.owner_email) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">No admin email configured for this tenant</p>
        </div>
      );
    }

    const isLoading = isCheckingUser || isCreatingUser || isSendingReset;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Admin User Status
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkUser}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isCheckingUser ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {userStatus === 'checking' && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">Checking user status...</span>
          </div>
        )}

        {userStatus === 'found' && userInfo && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">Admin user found in authentication system</span>
            </div>
            
            <div className="flex items-center space-x-4 p-3 border rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://avatar.vercel.sh/${userInfo.email}.png`} />
                <AvatarFallback>{userInfo.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{tenant.owner_name || userInfo.email}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {userInfo.email}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created: {formatDate(userInfo.created_at)}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSendReset}
              disabled={isSendingReset}
              className="w-full"
            >
              {isSendingReset ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  Sending Reset Email...
                </>
              ) : (
                <>
                  <KeyRound className="h-3 w-3 mr-2" />
                  Send Password Reset
                </>
              )}
            </Button>
          </div>
        )}

        {userStatus === 'not_found' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
              <XCircle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-700">No admin user found for {tenant.owner_email}</span>
            </div>
            
            <Button
              onClick={handleCreateUser}
              disabled={isCreatingUser}
              className="w-full"
            >
              {isCreatingUser ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  Creating Admin User...
                </>
              ) : (
                <>
                  <UserPlus className="h-3 w-3 mr-2" />
                  Create Admin User & Send Welcome Email
                </>
              )}
            </Button>
          </div>
        )}

        {userStatus === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700">Error checking user status. Please try again.</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">{tenant.name}</DialogTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge(tenant.status)}
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(tenant)}>
                  Edit Tenant
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500">Organization Name</p>
                  <p className="text-sm">{tenant.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Slug</p>
                  <p className="text-sm font-mono">{tenant.slug}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Type</p>
                  <p className="text-sm capitalize">{tenant.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Created</p>
                  <p className="text-sm">{formatDate(tenant.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin User Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Admin User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserStatusSection />
            </CardContent>
          </Card>

          {/* Owner Information */}
          {(tenant.owner_name || tenant.owner_email || tenant.owner_phone) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Owner Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tenant.owner_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{tenant.owner_name}</span>
                  </div>
                )}
                {tenant.owner_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{tenant.owner_email}</span>
                  </div>
                )}
                {tenant.owner_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{tenant.owner_phone}</span>
                  </div>
                )}
                {tenant.business_address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {typeof tenant.business_address === 'string' 
                        ? tenant.business_address 
                        : Object.values(tenant.business_address).filter(Boolean).join(', ')
                      }
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Subscription Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500">Plan</p>
                <p className="text-sm font-medium">{tenant.subscription_plan.replace('_', ' ')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500">Start Date</p>
                  <p className="text-sm">{formatDate(tenant.subscription_start_date)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">End Date</p>
                  <p className="text-sm">{formatDate(tenant.subscription_end_date)}</p>
                </div>
              </div>
              {tenant.trial_ends_at && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Trial Ends</p>
                  <p className="text-sm">{formatDate(tenant.trial_ends_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resource Limits */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Resource Limits & Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-medium">Farmers</span>
                  </div>
                  <p className="text-sm">0 / {tenant.max_farmers?.toLocaleString() || 'Unlimited'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-medium">Dealers</span>
                  </div>
                  <p className="text-sm">0 / {tenant.max_dealers?.toLocaleString() || 'Unlimited'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-purple-500" />
                    <span className="text-xs font-medium">Products</span>
                  </div>
                  <p className="text-sm">0 / {tenant.max_products?.toLocaleString() || 'Unlimited'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-medium">Storage</span>
                  </div>
                  <p className="text-sm">0 GB / {tenant.max_storage_gb || 'Unlimited'} GB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
