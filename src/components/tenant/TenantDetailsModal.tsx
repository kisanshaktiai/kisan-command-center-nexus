
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantUserCreator } from './TenantUserCreator';
import { Tenant } from '@/types/tenant';
import { TenantDisplayService } from '@/services/TenantDisplayService';
import { useTenantUserManagement } from '@/hooks/useTenantUserManagement';
import { 
  Edit3, 
  Calendar, 
  Mail, 
  Phone, 
  Building, 
  Globe, 
  Users, 
  Database,
  Activity,
  Settings,
  FileText,
  Loader2
} from 'lucide-react';

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
  onEdit
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'user-management'>('details');
  const { checkUserExists, isCheckingUser } = useTenantUserManagement();

  if (!tenant) return null;

  const formattedData = TenantDisplayService.formatTenantForDisplay(tenant);

  const handleEditClick = () => {
    onEdit(tenant);
    onClose();
  };

  const checkUser = async () => {
    if (!tenant.owner_email) return;
    
    try {
      const result = await checkUserExists(tenant.owner_email);
      console.log('User check result:', result);
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'user-management', label: 'User Management', icon: Users }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Building className="h-6 w-6" />
              {tenant.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant={formattedData.statusBadgeVariant as any}>
                {formattedData.displayStatus}
              </Badge>
              <Badge variant={formattedData.planBadgeVariant as any}>
                {formattedData.planDisplayName}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Organization Details</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>Name:</strong> {tenant.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>Slug:</strong> {tenant.slug}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>Type:</strong> {formattedData.displayType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-3">Contact Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>Email:</strong> {formattedData.ownerEmail}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>Phone:</strong> {formattedData.ownerPhone}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>Owner:</strong> {formattedData.ownerName}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Subscription & Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Subscription & Limits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{formattedData.limitsDisplay.farmers}</div>
                      <div className="text-xs text-muted-foreground">Max Farmers</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{formattedData.limitsDisplay.dealers}</div>
                      <div className="text-xs text-muted-foreground">Max Dealers</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{formattedData.limitsDisplay.storage}</div>
                      <div className="text-xs text-muted-foreground">Storage</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{formattedData.limitsDisplay.apiCalls}</div>
                      <div className="text-xs text-muted-foreground">API Calls/Day</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timestamps */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong className="text-sm">Created:</strong>
                    <p className="text-sm text-muted-foreground">{formattedData.formattedCreatedAt}</p>
                  </div>
                  <div>
                    <strong className="text-sm">Last Updated:</strong>
                    <p className="text-sm text-muted-foreground">{formattedData.formattedUpdatedAt}</p>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={handleEditClick} className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edit Tenant
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'user-management' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">User Management</h3>
                {tenant.owner_email && (
                  <Button 
                    onClick={checkUser} 
                    disabled={isCheckingUser}
                    variant="outline"
                    size="sm"
                  >
                    {isCheckingUser ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Activity className="h-4 w-4 mr-2" />
                        Check User Status
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              <TenantUserCreator 
                tenantId={tenant.id} 
                tenantName={tenant.name}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
