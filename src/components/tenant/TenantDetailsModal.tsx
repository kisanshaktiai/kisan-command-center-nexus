
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tenant } from '@/types/tenant';
import { TenantDisplayService } from '@/services/TenantDisplayService';
import { 
  Edit3, 
  Calendar, 
  Mail, 
  Phone, 
  Building, 
  Globe, 
  Users, 
  Database,
  Settings,
  FileText,
  CheckCircle,
  Shield,
  UserCheck,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface TenantDetailsModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tenant: Tenant) => void;
  validationResult?: any;
  isValidatingAccess?: boolean;
}

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onEdit,
  validationResult,
  isValidatingAccess = false
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'access-status'>('details');

  // Auto-switch to access status tab if there are validation results
  useEffect(() => {
    if (validationResult && !validationResult.hasAccess) {
      setActiveTab('access-status');
    }
  }, [validationResult]);

  if (!tenant) return null;

  const formattedData = TenantDisplayService.formatTenantForDisplay(tenant);

  const handleEditClick = () => {
    onEdit(tenant);
    onClose();
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'access-status', label: 'Access Status', icon: Shield }
  ];

  const getAccessStatusDisplay = () => {
    if (isValidatingAccess) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Validating system access...</p>
          </div>
        </div>
      );
    }

    if (!validationResult) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Shield className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Access validation not completed</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Overall Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult.hasAccess ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              )}
              Access Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {validationResult.hasAccess ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="space-y-2">
                    <p className="font-medium">✅ Complete System Access Verified</p>
                    <p className="text-sm">{validationResult.message}</p>
                    {validationResult.isAutoCreated && (
                      <p className="text-xs p-2 bg-blue-50 rounded border border-blue-200 text-blue-800">
                        🔗 System automatically created the required tenant connection for seamless access.
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">❌ System Access Issues Detected</p>
                    <p className="text-sm">{validationResult.message}</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* System Components Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Components
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Auth Status */}
              <div className="text-center p-4 border rounded-lg bg-background">
                <div className="flex items-center justify-center mb-2">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-sm font-medium mb-1">Authentication</div>
                <div className="text-xs text-muted-foreground">
                  ✅ User authenticated
                </div>
              </div>

              {/* Tenant Status */}
              <div className="text-center p-4 border rounded-lg bg-background">
                <div className="flex items-center justify-center mb-2">
                  <Building className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-sm font-medium mb-1">Tenant Record</div>
                <div className="text-xs text-muted-foreground">
                  ✅ {validationResult.tenant?.name || 'Tenant exists'}
                </div>
              </div>

              {/* User-Tenant Link Status */}
              <div className="text-center p-4 border rounded-lg bg-background">
                <div className="flex items-center justify-center mb-2">
                  {validationResult.relationship ? (
                    <UserCheck className="w-8 h-8 text-green-600" />
                  ) : (
                    <Users className="w-8 h-8 text-red-600" />
                  )}
                </div>
                <div className="text-sm font-medium mb-1">User-Tenant Link</div>
                <div className="text-xs text-muted-foreground">
                  {validationResult.relationship ? (
                    <>
                      ✅ Connected
                      {validationResult.isAutoCreated && (
                        <div className="mt-1 text-blue-600">
                          🔗 Auto-created
                        </div>
                      )}
                    </>
                  ) : (
                    '❌ Not connected'
                  )}
                </div>
              </div>
            </div>

            {validationResult.relationship && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <div className="text-sm">
                  <strong>Current Role:</strong> {validationResult.relationship.role}
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Status:</strong> {validationResult.relationship.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

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
              {validationResult?.hasAccess && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Access Verified
                </Badge>
              )}
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
                {tab.id === 'access-status' && isValidatingAccess && (
                  <Loader2 className="h-3 w-3 animate-spin ml-1" />
                )}
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

          {activeTab === 'access-status' && getAccessStatusDisplay()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
