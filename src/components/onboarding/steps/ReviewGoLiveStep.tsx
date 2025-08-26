
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Rocket } from 'lucide-react';
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
  status: 'complete' | 'incomplete' | 'warning';
  required: boolean;
}

export const ReviewGoLiveStep: React.FC<ReviewGoLiveStepProps> = ({
  tenantId,
  onComplete,
  data,
  onDataChange
}) => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    loadGoLiveChecklist();
  }, [tenantId]);

  const loadGoLiveChecklist = async () => {
    try {
      setIsLoading(true);
      
      // Load tenant data
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;

      // Load branding data
      const { data: branding } = await supabase
        .from('tenant_branding')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      // Load domain configuration
      const { data: domain } = await supabase
        .from('tenant_domains')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      // Load user invitations
      const { data: invitations } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('tenant_id', tenantId);

      // Generate checklist
      const checklistItems: ChecklistItem[] = [
        {
          id: 'basic_info',
          title: 'Basic Information',
          description: 'Tenant name, slug, and basic details configured',
          status: tenant?.name && tenant?.slug ? 'complete' : 'incomplete',
          required: true
        },
        {
          id: 'branding',
          title: 'Branding Configuration',
          description: 'Logo, colors, and branding elements set up',
          status: branding?.app_name ? 'complete' : 'warning',
          required: false
        },
        {
          id: 'domain',
          title: 'Domain Configuration',
          description: 'Domain and SSL configuration completed',
          status: domain?.domain_verified ? 'complete' : 'warning',
          required: false
        },
        {
          id: 'users',
          title: 'User Management',
          description: 'Admin users and team members invited',
          status: invitations && invitations.length > 0 ? 'complete' : 'warning',
          required: false
        },
        {
          id: 'subscription',
          title: 'Subscription Plan',
          description: 'Billing plan and subscription configured',
          status: tenant?.subscription_plan ? 'complete' : 'incomplete',
          required: true
        }
      ];

      setChecklist(checklistItems);
    } catch (error) {
      console.error('Error loading go-live checklist:', error);
      showError('Failed to load go-live checklist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoLive = async () => {
    try {
      setIsGoingLive(true);

      // Check if all required items are complete
      const incompleteRequired = checklist.filter(
        item => item.required && item.status === 'incomplete'
      );

      if (incompleteRequired.length > 0) {
        showError('Please complete all required items before going live');
        return;
      }

      // Update tenant status to active
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      const completionData = {
        goLiveDate: new Date().toISOString(),
        checklistResults: checklist,
        status: 'active',
        completedAt: new Date().toISOString()
      };

      showSuccess('Congratulations! Your tenant is now live!');
      onComplete(completionData);
    } catch (error) {
      console.error('Error going live:', error);
      showError('Failed to activate tenant');
    } finally {
      setIsGoingLive(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      complete: { variant: 'default' as const, text: 'Complete' },
      warning: { variant: 'secondary' as const, text: 'Optional' },
      incomplete: { variant: 'destructive' as const, text: 'Required' }
    };
    const config = variants[status as keyof typeof variants] || variants.incomplete;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Review & Go Live</h3>
          <p className="text-muted-foreground">Loading go-live checklist...</p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const requiredComplete = checklist.filter(item => item.required && item.status === 'complete').length;
  const requiredTotal = checklist.filter(item => item.required).length;
  const canGoLive = requiredComplete === requiredTotal;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Review & Go Live</h3>
        <p className="text-muted-foreground">
          Review your configuration and launch your tenant
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5" />
            Go-Live Checklist
          </CardTitle>
          <CardDescription>
            Complete the required items to activate your tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <h4 className="font-medium">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                {getStatusBadge(item.status)}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Required Items: {requiredComplete}/{requiredTotal}
                </p>
                <p className="text-sm text-muted-foreground">
                  {canGoLive 
                    ? 'All required items completed. Ready to go live!'
                    : 'Complete all required items to proceed'
                  }
                </p>
              </div>
              <Button
                onClick={handleGoLive}
                disabled={!canGoLive || isGoingLive}
                className="ml-4"
              >
                {isGoingLive ? 'Going Live...' : 'Go Live'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
