
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Users, 
  Building2, 
  Filter,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingWorkflowManager } from '@/components/onboarding/OnboardingWorkflowManager';
import { useNotifications } from '@/hooks/useNotifications';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  type: string;
  subscription_plan: string;
  created_at: string;
}

interface OnboardingWorkflow {
  id: string;
  tenant_id: string;
  status: string;
  current_step: number;
  total_steps: number;
  started_at: string | null;
  completed_at: string | null;
}

export default function TenantOnboardingEnhanced() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { showSuccess, showError } = useNotifications();

  // Fetch tenants with onboarding status
  const { 
    data: tenantsWithOnboarding = [], 
    isLoading: tenantsLoading, 
    refetch: refetchTenants 
  } = useQuery({
    queryKey: ['tenants-onboarding', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('tenants')
        .select(`
          *,
          onboarding_workflows(
            id,
            status,
            current_step,
            total_steps,
            started_at,
            completed_at
          )
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'no_workflow') {
          // Filter for tenants without workflows
          query = query.is('onboarding_workflows', null);
        } else {
          // Filter by workflow status
          query = query.eq('onboarding_workflows.status', statusFilter);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tenants:', error);
        throw error;
      }

      return data.map(tenant => ({
        ...tenant,
        onboarding_workflow: tenant.onboarding_workflows?.[0] || null
      }));
    },
    refetchOnWindowFocus: false
  });

  const handleTenantSelect = (tenant: Tenant) => {
    setSelectedTenant(tenant);
  };

  const handleRefresh = () => {
    refetchTenants();
    showSuccess('Tenant list refreshed');
  };

  const filteredTenants = tenantsWithOnboarding.filter(tenant => {
    if (statusFilter === 'no_workflow') {
      return !tenant.onboarding_workflow;
    }
    if (statusFilter !== 'all') {
      return tenant.onboarding_workflow?.status === statusFilter;
    }
    return true;
  });

  const getOnboardingStatus = (tenant: any) => {
    if (!tenant.onboarding_workflow) {
      return { status: 'No Workflow', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    }
    
    const workflow = tenant.onboarding_workflow;
    const statusMap = {
      'not_started': { status: 'Not Started', color: 'text-gray-600', bgColor: 'bg-gray-100' },
      'in_progress': { status: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      'completed': { status: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
      'failed': { status: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' }
    };
    
    return statusMap[workflow.status] || statusMap['not_started'];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Tenant Onboarding</h1>
          <p className="text-muted-foreground">
            Manage tenant onboarding workflows with detailed step tracking
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant List */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Search and Filters */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tenants..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Filter by Status</Label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="mt-1 w-full p-2 border rounded-md text-sm"
                    >
                      <option value="all">All Tenants</option>
                      <option value="no_workflow">No Workflow</option>
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>

                {/* Tenant List */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {tenantsLoading ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      Loading tenants...
                    </div>
                  ) : filteredTenants.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No tenants found
                    </div>
                  ) : (
                    filteredTenants.map((tenant) => {
                      const onboardingStatus = getOnboardingStatus(tenant);
                      return (
                        <div
                          key={tenant.id}
                          onClick={() => handleTenantSelect(tenant)}
                          className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                            selectedTenant?.id === tenant.id 
                              ? 'ring-2 ring-primary border-primary shadow-md' 
                              : 'hover:border-muted-foreground/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-sm truncate">
                                {tenant.name}
                              </h3>
                              <p className="text-xs text-muted-foreground truncate">
                                {tenant.slug} • {tenant.subscription_plan}
                              </p>
                              {tenant.onboarding_workflow && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {tenant.onboarding_workflow.current_step}/
                                  {tenant.onboarding_workflow.total_steps} steps
                                </div>
                              )}
                            </div>
                            <div 
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                onboardingStatus.bgColor
                              } ${onboardingStatus.color}`}
                            >
                              {onboardingStatus.status}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Onboarding Workflow Details */}
        <div className="lg:col-span-2">
          {selectedTenant ? (
            <OnboardingWorkflowManager
              tenantId={selectedTenant.id}
              tenantName={selectedTenant.name}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  Select a Tenant
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose a tenant from the list to view and manage their onboarding workflow
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
