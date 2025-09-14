
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle, Building, Mail, Calendar, User } from 'lucide-react';
import { useConvertLeadToTenant } from '@/hooks/useLeadManagement';
import { supabase } from '@/integrations/supabase/client';
import type { Lead } from '@/types/leads';
import type { Tenant } from '@/types/tenant';
import { convertDatabaseTenant } from '@/types/tenant';

interface TenantVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onConversionSuccess?: () => void;
}

interface TenantVerificationData {
  isVerified: boolean;
  tenant: Tenant | null;
  verificationStatus: 'verified' | 'not_found' | 'mismatch' | 'checking';
  discrepancies: string[];
}

export const TenantVerificationModal: React.FC<TenantVerificationModalProps> = ({
  isOpen,
  onClose,
  lead,
  onConversionSuccess
}) => {
  const [verificationData, setVerificationData] = useState<TenantVerificationData>({
    isVerified: false,
    tenant: null,
    verificationStatus: 'checking',
    discrepancies: []
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const convertMutation = useConvertLeadToTenant();

  const verifyTenantStatus = async () => {
    if (!lead?.converted_tenant_id) {
      setVerificationData({
        isVerified: false,
        tenant: null,
        verificationStatus: 'not_found',
        discrepancies: ['No tenant ID associated with this lead']
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: tenantData, error } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_branding (*),
          tenant_features (*)
        `)
        .eq('id', lead.converted_tenant_id)
        .single();

      if (error || !tenantData) {
        setVerificationData({
          isVerified: false,
          tenant: null,
          verificationStatus: 'not_found',
          discrepancies: ['Tenant record not found in database']
        });
        return;
      }

      // Convert database tenant to proper Tenant type
      const tenant = convertDatabaseTenant(tenantData);

      // Check for discrepancies
      const discrepancies: string[] = [];
      
      if (tenant.owner_email && tenant.owner_email !== lead.email) {
        discrepancies.push(`Email mismatch: Lead (${lead.email}) vs Tenant (${tenant.owner_email})`);
      }

      if (tenant.owner_name && tenant.owner_name !== lead.contact_name) {
        discrepancies.push(`Name mismatch: Lead (${lead.contact_name}) vs Tenant (${tenant.owner_name})`);
      }

      const verificationStatus = discrepancies.length > 0 ? 'mismatch' : 'verified';

      setVerificationData({
        isVerified: verificationStatus === 'verified',
        tenant,
        verificationStatus,
        discrepancies
      });
    } catch (error) {
      console.error('Error verifying tenant:', error);
      setVerificationData({
        isVerified: false,
        tenant: null,
        verificationStatus: 'not_found',
        discrepancies: ['Error occurred while checking tenant status']
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && lead) {
      verifyTenantStatus();
    }
  }, [isOpen, lead]);

  const handleConvertToTenant = async () => {
    if (!lead) return;

    try {
      await convertMutation.mutateAsync({
        leadId: lead.id,
        tenantName: lead.organization_name || `${lead.contact_name} Organization`,
        tenantSlug: (lead.organization_name || lead.contact_name)
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-'),
        subscriptionPlan: 'Kisan_Basic',
        adminEmail: lead.email,
        adminName: lead.contact_name,
      });

      // Refresh verification status after conversion
      await verifyTenantStatus();
      onConversionSuccess?.();
    } catch (error) {
      console.error('Conversion failed:', error);
    }
  };

  const getStatusIcon = () => {
    switch (verificationData.verificationStatus) {
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'mismatch':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'not_found':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (verificationData.verificationStatus) {
      case 'verified':
        return 'Tenant Successfully Created';
      case 'mismatch':
        return 'Tenant Found with Discrepancies';
      case 'not_found':
        return 'Tenant Not Found';
      default:
        return 'Checking...';
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Tenant Verification Status
          </DialogTitle>
          <DialogDescription>
            Verifying tenant creation status for lead: {lead.contact_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Verification Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                {getStatusIcon()}
                {getStatusText()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={lead.status === 'converted' ? 'default' : 'secondary'}>
                  Lead Status: {lead.status}
                </Badge>
                {lead.converted_at && (
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    Converted: {new Date(lead.converted_at).toLocaleDateString()}
                  </Badge>
                )}
              </div>
              
              {verificationData.discrepancies.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <h4 className="font-medium text-yellow-800 mb-2">Issues Found:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {verificationData.discrepancies.map((discrepancy, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {discrepancy}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lead Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{lead.contact_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{lead.email}</span>
              </div>
              {lead.organization_name && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.organization_name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tenant Information */}
          {verificationData.tenant && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tenant Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{verificationData.tenant.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Slug:</span>
                  <span>{verificationData.tenant.slug}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={verificationData.tenant.status === 'active' ? 'default' : 'secondary'}>
                    {verificationData.tenant.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Plan:</span>
                  <Badge variant="outline">{verificationData.tenant.subscription_plan}</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          
          {verificationData.verificationStatus === 'not_found' && lead.status === 'qualified' && (
            <Button 
              onClick={handleConvertToTenant}
              disabled={convertMutation.isPending}
              className="min-w-[140px]"
            >
              {convertMutation.isPending ? 'Converting...' : 'Convert to Tenant'}
            </Button>
          )}
          
          {verificationData.verificationStatus === 'not_found' && lead.status !== 'qualified' && (
            <Button variant="secondary" disabled>
              Lead Must Be Qualified First
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
