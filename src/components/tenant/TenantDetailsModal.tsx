
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantBillingTab } from './TenantBillingTab';
import { TenantUsersTab } from './tabs/TenantUsersTab';
import { TenantSettingsTab } from './tabs/TenantSettingsTab';
import { Edit, ExternalLink, Calendar, Users, Building2 } from 'lucide-react';
import type { Tenant } from '@/types/tenant';

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
  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {tenant.name}
          </DialogTitle>
          <DialogDescription>
            Comprehensive tenant information and management
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                      {tenant.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Type:</span>
                    <span className="text-sm">{tenant.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Slug:</span>
                    <span className="text-sm font-mono">{tenant.slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Plan:</span>
                    <Badge variant="outline">{tenant.subscription_plan}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Owner Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm">{tenant.owner_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm">{tenant.owner_email}</span>
                  </div>
                  {tenant.owner_phone && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Phone:</span>
                      <span className="text-sm">{tenant.owner_phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Important Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Created:</span>
                    <span className="text-sm">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {tenant.trial_ends_at && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Trial Ends:</span>
                      <span className="text-sm">
                        {new Date(tenant.trial_ends_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {tenant.subscription_end_date && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Subscription Ends:</span>
                      <span className="text-sm">
                        {new Date(tenant.subscription_end_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resource Limits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Farmers: {tenant.max_farmers || 'Unlimited'}</div>
                    <div>Dealers: {tenant.max_dealers || 'Unlimited'}</div>
                    <div>Products: {tenant.max_products || 'Unlimited'}</div>
                    <div>Storage: {tenant.max_storage_gb || 'Unlimited'} GB</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="billing">
            <TenantBillingTab tenant={tenant} />
          </TabsContent>

          <TabsContent value="users">
            <TenantUsersTab tenant={tenant} />
          </TabsContent>

          <TabsContent value="settings">
            <TenantSettingsTab tenant={tenant} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            {tenant.subdomain && (
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit Site
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {onEdit && (
              <Button onClick={() => onEdit(tenant)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
