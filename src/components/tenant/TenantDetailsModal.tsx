
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Mail, 
  User, 
  Calendar, 
  CreditCard, 
  Users, 
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Shield,
  Link as LinkIcon
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { useTenantUserManagement } from '@/hooks/useTenantUserManagement';
import { TenantUserCreator } from './TenantUserCreator';
import { TenantRelationshipStatus } from '@/services/UserTenantService';

interface TenantDetailsModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (tenant: Tenant) => void;
}

interface TenantRelationshipInfo {
  status: TenantRelationshipStatus | null;
  loading: boolean;
  error?: string;
}

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onEdit
}) => {
  const [showUserCreator, setShowUserCreator] = useState(false);
  const [relationshipInfo, setRelationshipInfo] = useState<TenantRelationshipInfo>({
    status: null,
    loading: false
  });

  const {
    checkAndEnsureTenantRelationship,
    isEnsuringRelationship,
    ensureUserTenantRecord,
    isFixingRelationship
  } = useTenantUserManagement();

  // Check tenant relationship status when modal opens
  useEffect(() => {
    if (isOpen && tenant?.owner_email && tenant?.id) {
      checkTenantRelationship();
    }
  }, [isOpen, tenant?.owner_email, tenant?.id]);

  const checkTenantRelationship = async () => {
    if (!tenant?.owner_email || !tenant?.id) return;

    setRelationshipInfo({ status: null, loading: true });
    
    try {
      const status = await checkAndEnsureTenantRelationship(tenant.owner_email, tenant.id);
      setRelationshipInfo({ 
        status, 
        loading: false 
      });
    } catch (error) {
      console.error('Error checking tenant relationship:', error);
      setRelationshipInfo({ 
        status: null, 
        loading: false, 
        error: 'Failed to check tenant relationship' 
      });
    }
  };

  const handleFixRelationship = async () => {
    if (!relationshipInfo.status?.userId || !tenant?.id) return;

    const success = await ensureUserTenantRecord(relationshipInfo.status.userId, tenant.id);
    if (success) {
      // Refresh the relationship status
      await checkTenantRelationship();
    }
  };

  const renderRelationshipStatus = () => {
    if (relationshipInfo.loading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              User-Tenant Relationship
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Checking relationship status...</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (relationshipInfo.error) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              User-Tenant Relationship
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {relationshipInfo.error}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={checkTenantRelationship}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    if (!relationshipInfo.status) {
      return null;
    }

    const { status } = relationshipInfo;
    const isValid = status.hasRelationship && status.isValid;
    const hasIssues = status.issues.length > 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User-Tenant Relationship
            {isValid && <CheckCircle className="h-5 w-5 text-green-500" />}
            {hasIssues && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Relationship Status</label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={status.hasRelationship ? "default" : "destructive"}>
                  {status.hasRelationship ? "EXISTS" : "MISSING"}
                </Badge>
                {status.hasRelationship && (
                  <Badge variant={status.isValid ? "default" : "secondary"}>
                    {status.isValid ? "VALID" : "INVALID"}
                  </Badge>
                )}
              </div>
            </div>
            
            {status.relationship && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Role</label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={status.relationship.role === 'tenant_admin' ? "default" : "secondary"}>
                    {status.relationship.role}
                  </Badge>
                  <Badge variant={status.relationship.is_active ? "default" : "destructive"}>
                    {status.relationship.is_active ? "ACTIVE" : "INACTIVE"}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {status.userId && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <p className="text-sm font-mono bg-muted p-2 rounded mt-1">{status.userId}</p>
            </div>
          )}

          {hasIssues && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <strong>Issues found:</strong>
                  <ul className="list-disc list-inside ml-2">
                    {status.issues.map((issue, index) => (
                      <li key={index} className="text-sm">{issue}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkTenantRelationship}
              disabled={relationshipInfo.loading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh Status
            </Button>

            {status.userId && hasIssues && (
              <Button
                variant="default"
                size="sm"
                onClick={handleFixRelationship}
                disabled={isFixingRelationship}
              >
                <LinkIcon className="h-4 w-4 mr-1" />
                {isFixingRelationship ? 'Fixing...' : 'Fix Relationship'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!tenant) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {tenant.name}
            </DialogTitle>
            <DialogDescription>
              Detailed information about this tenant organization
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Relationship Status Card */}
              {renderRelationshipStatus()}

              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Organization Name</label>
                      <p className="font-medium">{tenant.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Slug</label>
                      <p className="font-mono text-sm bg-muted p-1 rounded">{tenant.slug}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Type</label>
                      <Badge variant="outline">{tenant.type}</Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                        {tenant.status}
                      </Badge>
                    </div>
                  </div>

                  {tenant.subdomain && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Subdomain</label>
                      <p className="font-mono text-sm">{tenant.subdomain}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Created</label>
                      <p className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                      <p className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(tenant.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Owner Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Owner Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Owner Name</label>
                      <p className="font-medium">{tenant.owner_name || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Owner Email</label>
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {tenant.owner_email}
                      </p>
                    </div>
                  </div>
                  {tenant.owner_phone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p>{tenant.owner_phone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Subscription & Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Subscription & Limits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Subscription Plan</label>
                      <Badge variant="outline">{tenant.subscription_plan}</Badge>
                    </div>
                    {tenant.trial_ends_at && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Trial Ends</label>
                        <p className="text-sm">{new Date(tenant.trial_ends_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Max Farmers</span>
                        <Badge variant="outline">{tenant.max_farmers?.toLocaleString()}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Max Dealers</span>
                        <Badge variant="outline">{tenant.max_dealers?.toLocaleString()}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Max Products</span>
                        <Badge variant="outline">{tenant.max_products?.toLocaleString()}</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Storage</span>
                        <Badge variant="outline">{tenant.max_storage_gb} GB</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">API Calls/Day</span>
                        <Badge variant="outline">{tenant.max_api_calls_per_day?.toLocaleString()}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUserCreator(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
            </div>
            
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="outline" onClick={() => onEdit(tenant)}>
                  Edit Tenant
                </Button>
              )}
              <Button variant="default" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TenantUserCreator
        tenant={tenant}
        isOpen={showUserCreator}
        onClose={() => setShowUserCreator(false)}
      />
    </>
  );
};
