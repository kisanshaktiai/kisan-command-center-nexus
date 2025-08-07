import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Users, 
  Zap, 
  Database, 
  Activity,
  Edit,
  X
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantEmailActions } from './TenantEmailActions';

interface TenantDetailsModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tenant: Tenant) => void;
}

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onEdit,
}) => {
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatBusinessAddress = (address: any) => {
    if (!address || typeof address !== 'object') return 'Not provided';
    
    const parts = [
      address.street,
      address.city,
      address.state,
      address.postal_code,
      address.country
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'Not provided';
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-muted-foreground" />
              <div>
                <DialogTitle className="text-xl font-bold">
                  {tenant.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(tenant.status)}`} />
                  <span className="text-sm text-muted-foreground capitalize">
                    {tenant.status}
                  </span>
                  <Badge variant={getSubscriptionBadgeVariant(tenant.subscription_plan)}>
                    {tenant.subscription_plan.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Tenant Name</span>
                    <p className="font-medium">{tenant.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Slug</span>
                    <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {tenant.slug}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Type</span>
                    <p className="capitalize">{tenant.type?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(tenant.status)}`} />
                      <span className="capitalize">{tenant.status}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Created</span>
                    <p>{formatDate(tenant.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Last Updated</span>
                    <p>{formatDate(tenant.updated_at)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Subscription Plan</span>
                    <Badge variant={getSubscriptionBadgeVariant(tenant.subscription_plan)} className="mt-1">
                      {tenant.subscription_plan.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Owner Email
                    </span>
                    <p className="font-medium">{tenant.owner_email || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Owner Name
                    </span>
                    <p className="font-medium">{tenant.owner_name || 'Not provided'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone
                    </span>
                    <p className="font-medium">{tenant.owner_phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Business Address
                    </span>
                    <p className="font-medium text-sm leading-relaxed">
                      {formatBusinessAddress(tenant.business_address)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Subscription & Limits */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Subscription & Limits</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Max Farmers
                  </span>
                  <p className="font-bold text-lg">{tenant.max_farmers?.toLocaleString() || 'Unlimited'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Max Dealers
                  </span>
                  <p className="font-bold text-lg">{tenant.max_dealers?.toLocaleString() || 'Unlimited'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Storage (GB)
                  </span>
                  <p className="font-bold text-lg">{tenant.max_storage_gb || 'Unlimited'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    API Calls/Day
                  </span>
                  <p className="font-bold text-lg">{tenant.max_api_calls_per_day?.toLocaleString() || 'Unlimited'}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Domain Information */}
            {(tenant.subdomain || tenant.custom_domain) && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Domain Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tenant.subdomain && (
                      <div>
                        <span className="text-sm text-muted-foreground">Subdomain</span>
                        <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {tenant.subdomain}
                        </p>
                      </div>
                    )}
                    {tenant.custom_domain && (
                      <div>
                        <span className="text-sm text-muted-foreground">Custom Domain</span>
                        <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {tenant.custom_domain}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Additional Metadata */}
            {tenant.metadata && Object.keys(tenant.metadata).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap overflow-auto">
                    {JSON.stringify(tenant.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/50">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Last activity: {formatDate(tenant.updated_at)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <TenantEmailActions tenant={tenant} />
            <Button variant="outline" onClick={() => onEdit(tenant)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Tenant
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
