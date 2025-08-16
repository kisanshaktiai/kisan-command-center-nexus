
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Rocket, Eye, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface ReviewGoLiveStepProps {
  tenantId: string;
  onComplete: (data: any) => void;
  data: any;
  onDataChange: (data: any) => void;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'warning' | 'pending';
  required: boolean;
}

export const ReviewGoLiveStep: React.FC<ReviewGoLiveStepProps> = ({
  tenantId,
  onComplete,
  data,
  onDataChange
}) => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [tenantData, setTenantData] = useState<any>(null);
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    loadTenantData();
  }, [tenantId]);

  const loadTenantData = async () => {
    try {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_branding(*),
          user_tenants(count)
        `)
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      setTenantData(tenant);
      generateChecklist(tenant);
    } catch (error) {
      console.error('Error loading tenant data:', error);
    }
  };

  const generateChecklist = (tenant: any) => {
    const items: ChecklistItem[] = [
      {
        id: 'company_profile',
        title: 'Company Profile',
        description: 'Business details and verification completed',
        status: tenant.business_registration ? 'completed' : 'pending',
        required: true
      },
      {
        id: 'subscription_plan',
        title: 'Subscription Plan',
        description: 'Billing plan selected and configured',
        status: tenant.subscription_plan ? 'completed' : 'pending',
        required: true
      },
      {
        id: 'branding',
        title: 'Branding Setup',
        description: 'App customization and branding configured',
        status: tenant.tenant_branding?.length > 0 ? 'completed' : 'warning',
        required: false
      },
      {
        id: 'users',
        title: 'Team Members',
        description: 'Users and roles configured',
        status: tenant.user_tenants?.length > 0 ? 'completed' : 'warning',
        required: false
      },
      {
        id: 'domain',
        title: 'Domain Configuration',
        description: 'Custom domain or subdomain setup',
        status: tenant.custom_domain || tenant.subdomain ? 'completed' : 'warning',
        required: false
      },
      {
        id: 'security',
        title: 'Security Settings',
        description: 'SSL and security configurations',
        status: 'completed', // Always completed for our platform
        required: true
      }
    ];

    setChecklist(items);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'completed': { variant: 'default', text: 'Complete' },
      'warning': { variant: 'secondary', text: 'Optional' },
      'pending': { variant: 'outline', text: 'Pending' }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const canGoLive = () => {
    return checklist
      .filter(item => item.required)
      .every(item => item.status === 'completed');
  };

  const handleGoLive = async () => {
    try {
      setIsGoingLive(true);

      // Update tenant status to active
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          status: 'active',
          metadata: {
            ...tenantData?.metadata,
            onboardingCompleted: true,
            goLiveAt: new Date().toISOString(),
            onboardingData: data
          }
        })
        .eq('id', tenantId);

      if (tenantError) throw tenantError;

      // Mark onboarding workflow as completed
      const { error: workflowError } = await supabase
        .from('onboarding_workflows')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId);

      if (workflowError) console.warn('Error updating workflow:', workflowError);

      showSuccess('Congratulations! Your tenant is now live!');
      onComplete({ goLive: true, completedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Error going live:', error);
      showError('Failed to activate tenant');
    } finally {
      setIsGoingLive(false);
    }
  };

  const handlePreviewTenant = () => {
    const previewUrl = tenantData?.custom_domain 
      ? `https://${tenantData.custom_domain}`
      : tenantData?.subdomain
      ? `https://${tenantData.subdomain}.kisanshakti.com`
      : `https://app.kisanshakti.com/tenant/${tenantId}`;
    
    window.open(previewUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Review & Go Live</h3>
        <p className="text-muted-foreground">
          Review your setup and activate your tenant
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pre-Launch Checklist</CardTitle>
          <CardDescription>
            Ensure all required configurations are completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.required && (
                    <Badge variant="outline" className="text-xs">Required</Badge>
                  )}
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Ready to Go Live?</h4>
                <p className="text-sm text-muted-foreground">
                  {canGoLive() 
                    ? 'All required configurations are complete'
                    : 'Please complete all required items before going live'
                  }
                </p>
              </div>
              <Badge variant={canGoLive() ? 'default' : 'secondary'}>
                {canGoLive() ? 'Ready' : 'Pending'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Summary</CardTitle>
          <CardDescription>
            Overview of your configured tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenantData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Organization</Label>
                  <p className="text-sm font-medium">{tenantData.name}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Plan</Label>
                  <p className="text-sm font-medium">{tenantData.subscription_plan}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                  <Badge variant={tenantData.status === 'active' ? 'default' : 'secondary'}>
                    {tenantData.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Domain</Label>
                  <p className="text-sm font-medium">
                    {tenantData.custom_domain || tenantData.subdomain || 'Not configured'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Created</Label>
                  <p className="text-sm font-medium">
                    {new Date(tenantData.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Team Size</Label>
                  <p className="text-sm font-medium">
                    {tenantData.user_tenants?.length || 0} members
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>
            What happens after going live
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Tenant Activation</p>
                <p className="text-muted-foreground">Your tenant will be activated and accessible to users</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">User Access</p>
                <p className="text-muted-foreground">Invited users will receive access to the platform</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Support & Monitoring</p>
                <p className="text-muted-foreground">Our team will monitor your tenant for optimal performance</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Ongoing Support</p>
                <p className="text-muted-foreground">Access to documentation, support, and regular updates</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePreviewTenant}
          disabled={!tenantData}
        >
          <Eye className="w-4 h-4 mr-2" />
          Preview Tenant
        </Button>

        <Button
          onClick={handleGoLive}
          disabled={!canGoLive() || isGoingLive}
          className="min-w-32"
        >
          {isGoingLive ? (
            'Going Live...'
          ) : (
            <>
              <Rocket className="w-4 h-4 mr-2" />
              Go Live!
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
