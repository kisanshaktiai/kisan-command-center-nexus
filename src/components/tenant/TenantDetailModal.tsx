
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building2, 
  Edit, 
  Trash2, 
  Users, 
  Crown, 
  Calendar, 
  MapPin, 
  Mail, 
  Phone, 
  Globe,
  Database,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantService } from '@/services/tenantService';

interface TenantDetailModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
}

export const TenantDetailModal: React.FC<TenantDetailModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  if (!tenant) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFeatureCount = () => {
    if (!tenant.features) return 0;
    return Object.values(tenant.features).filter(Boolean).length;
  };

  const getBusinessAddress = () => {
    if (!tenant.business_address) return 'Not specified';
    if (typeof tenant.business_address === 'string') {
      return tenant.business_address;
    }
    return tenant.business_address?.city || 'Not specified';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{tenant.name}</h2>
              <p className="text-sm text-muted-foreground">{tenant.slug}</p>
            </div>
            <div className="ml-auto flex gap-2">
              <Badge variant={TenantService.getStatusBadgeVariant(tenant.status)}>
                {tenant.status?.toUpperCase()}
              </Badge>
              <Badge variant={TenantService.getPlanBadgeVariant(tenant.subscription_plan)}>
                {TenantService.getPlanDisplayName(tenant.subscription_plan)}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Type:</span>
                <span className="text-sm text-muted-foreground capitalize">
                  {tenant.type?.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Created:</span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(tenant.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Updated:</span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(tenant.updated_at)}
                </span>
              </div>
              {tenant.subdomain && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Subdomain:</span>
                  <span className="text-sm text-muted-foreground">
                    {tenant.subdomain}
                  </span>
                </div>
              )}
              {tenant.custom_domain && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Custom Domain:</span>
                  <span className="text-sm text-muted-foreground">
                    {tenant.custom_domain}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Owner Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Owner Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tenant.owner_name && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Name:</span>
                  <span className="text-sm text-muted-foreground">{tenant.owner_name}</span>
                </div>
              )}
              {tenant.owner_email && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm text-muted-foreground">{tenant.owner_email}</span>
                </div>
              )}
              {tenant.owner_phone && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Phone:</span>
                  <span className="text-sm text-muted-foreground">{tenant.owner_phone}</span>
                </div>
              )}
              {tenant.business_registration && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Registration:</span>
                  <span className="text-sm text-muted-foreground">
                    {tenant.business_registration}
                  </span>
                </div>
              )}
              {tenant.business_address && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Address:</span>
                  <span className="text-sm text-muted-foreground">
                    {getBusinessAddress()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Plan:</span>
                <span className="text-sm text-muted-foreground">
                  {TenantService.getPlanDisplayName(tenant.subscription_plan)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Start Date:</span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(tenant.subscription_start_date)}
                </span>
              </div>
              {tenant.subscription_end_date && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium">End Date:</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(tenant.subscription_end_date)}
                  </span>
                </div>
              )}
              {tenant.trial_ends_at && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Trial Ends:</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(tenant.trial_ends_at)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Plan Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 p-3 rounded">
                  <div className="text-xs font-medium">Farmers</div>
                  <div className="text-sm text-muted-foreground">
                    {tenant.max_farmers?.toLocaleString() || 'N/A'}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded">
                  <div className="text-xs font-medium">Dealers</div>
                  <div className="text-sm text-muted-foreground">
                    {tenant.max_dealers?.toLocaleString() || 'N/A'}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded">
                  <div className="text-xs font-medium">Products</div>
                  <div className="text-sm text-muted-foreground">
                    {tenant.max_products?.toLocaleString() || 'N/A'}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded">
                  <div className="text-xs font-medium">Storage</div>
                  <div className="text-sm text-muted-foreground">
                    {tenant.max_storage_gb || 'N/A'} GB
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Features ({getFeatureCount()} enabled)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {tenant.features && Object.entries(tenant.features).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-6" />

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => onEdit(tenant)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDelete(tenant.id)}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
