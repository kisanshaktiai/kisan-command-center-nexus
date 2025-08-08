
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
import { FormattedTenantData } from '@/services/TenantDisplayService';
import { TenantEmailActions } from './TenantEmailActions';

interface TenantDetailsModalRefactoredProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tenant: Tenant) => void;
  tenant: Tenant | null;
  formattedData: FormattedTenantData | null;
}

export const TenantDetailsModalRefactored: React.FC<TenantDetailsModalRefactoredProps> = ({
  isOpen,
  onClose,
  onEdit,
  tenant,
  formattedData
}) => {
  if (!tenant || !formattedData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-muted-foreground" />
              <div>
                <DialogTitle className="text-xl font-bold">
                  {formattedData.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full bg-green-500`} />
                  <span className="text-sm text-muted-foreground">
                    {formattedData.displayStatus}
                  </span>
                  <Badge variant={formattedData.planBadgeVariant as any}>
                    {formattedData.planDisplayName}
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
                    <p className="font-medium">{formattedData.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Slug</span>
                    <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {formattedData.slug}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Type</span>
                    <p>{formattedData.displayType}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>{formattedData.displayStatus}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Created</span>
                    <p>{formattedData.formattedCreatedAt}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Last Updated</span>
                    <p>{formattedData.formattedUpdatedAt}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Subscription Plan</span>
                    <Badge variant={formattedData.planBadgeVariant as any} className="mt-1">
                      {formattedData.planDisplayName}
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
                    <p className="font-medium">{formattedData.ownerEmail}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Owner Name
                    </span>
                    <p className="font-medium">{formattedData.ownerName}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone
                    </span>
                    <p className="font-medium">{formattedData.ownerPhone}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Business Address
                    </span>
                    <p className="font-medium text-sm leading-relaxed">
                      {formattedData.formattedBusinessAddress}
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
                  <p className="font-bold text-lg">{formattedData.limitsDisplay.farmers}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Max Dealers
                  </span>
                  <p className="font-bold text-lg">{formattedData.limitsDisplay.dealers}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Storage
                  </span>
                  <p className="font-bold text-lg">{formattedData.limitsDisplay.storage}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    API Calls/Day
                  </span>
                  <p className="font-bold text-lg">{formattedData.limitsDisplay.apiCalls}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Domain Information */}
            {(formattedData.domainInfo.subdomain || formattedData.domainInfo.customDomain) && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Domain Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formattedData.domainInfo.subdomain && (
                      <div>
                        <span className="text-sm text-muted-foreground">Subdomain</span>
                        <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {formattedData.domainInfo.subdomain}
                        </p>
                      </div>
                    )}
                    {formattedData.domainInfo.customDomain && (
                      <div>
                        <span className="text-sm text-muted-foreground">Custom Domain</span>
                        <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {formattedData.domainInfo.customDomain}
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
              Last activity: {formattedData.formattedUpdatedAt}
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
