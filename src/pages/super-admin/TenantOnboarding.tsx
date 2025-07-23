
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Clock, AlertCircle, Play, Pause, RotateCcw, Plus, Search, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { OnboardingWorkflowCard } from '@/components/tenant/OnboardingWorkflowCard';
import { OnboardingStepCard } from '@/components/tenant/OnboardingStepCard';
import { OnboardingAnalytics } from '@/components/tenant/OnboardingAnalytics';

interface OnboardingWorkflow {
  id: string;
  tenant_id: string;
  current_step: number;
  total_steps: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  tenants?: {
    name: string;
    status: string;
    owner_name?: string;
    subscription_plan?: string;
  };
}

interface OnboardingStep {
  id: string;
  workflow_id: string;
  step_number: number;
  step_name: string;
  step_status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  step_data: Record<string, any>;
  validation_errors: any[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const ONBOARDING_STEPS = [
  { number: 1, name: 'Business Verification', description: 'Verify GST, PAN, and business documents' },
  { number: 2, name: 'Subscription Plan', description: 'Select and configure subscription plan' },
  { number: 3, name: 'Branding Configuration', description: 'Set up logo, colors, and brand identity' },
  { number: 4, name: 'Feature Selection', description: 'Choose features and set limits' },
  { number: 5, name: 'Data Import', description: 'Import existing farmer and product data' },
  { number: 6, name: 'Team Invites', description: 'Invite team members and set roles' }
];

export default function TenantOnboarding() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Check if user is admin
  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ['admin-check'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, role, is_active')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (error) {
        console.log('Admin check error:', error);
        return false;
      }
      
      return data && data.is_active && ['super_admin', 'platform_admin'].includes(data.role);
    }
  });

  // Set up real-time subscription for workflows
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('onboarding-workflows-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'onboarding_workflows' },
        (payload) => {
          console.log('Workflow change:', payload);
          queryClient.invalidateQueries({ queryKey: ['onboarding-workflows'] });
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'onboarding_steps' },
        (payload) => {
          console.log('Step change:', payload);
          queryClient.invalidateQueries({ queryKey: ['onboarding-steps'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, isAdmin]);

  // Fetch onboarding workflows with enhanced query
  const { data: workflows = [], isLoading: workflowsLoading, refetch: refetchWorkflows } = useQuery({
    queryKey: ['onboarding-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_workflows')
        .select(`
          *,
          tenants(name, status, owner_name, subscription_plan)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching workflows:', error);
        throw error;
      }
      return data as OnboardingWorkflow[];
    },
    enabled: !!isAdmin,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch onboarding steps with real-time updates
  const { data: steps = [], isLoading: stepsLoading, refetch: refetchSteps } = useQuery({
    queryKey: ['onboarding-steps', selectedWorkflow?.id],
    queryFn: async () => {
      if (!selectedWorkflow?.id) return [];
      
      const { data, error } = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('workflow_id', selectedWorkflow.id)
        .order('step_number');
      
      if (error) throw error;
      
      return data.map(step => ({
        ...step,
        validation_errors: Array.isArray(step.validation_errors) ? 
          step.validation_errors : 
          typeof step.validation_errors === 'string' ? 
            JSON.parse(step.validation_errors) : []
      })) as OnboardingStep[];
    },
    enabled: !!selectedWorkflow?.id && !!isAdmin,
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  // Fetch available tenants
  const { data: availableTenants = [] } = useQuery({
    queryKey: ['available-tenants'],
    queryFn: async () => {
      const { data: workflowData } = await supabase
        .from('onboarding_workflows')
        .select('tenant_id');
      
      const existingTenantIds = workflowData?.map(w => w.tenant_id) || [];
      
      let query = supabase
        .from('tenants')
        .select('id, name, owner_name, subscription_plan')
        .eq('status', 'active');
      
      if (existingTenantIds.length > 0) {
        query = query.not('id', 'in', `(${existingTenantIds.join(',')})`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin
  });

  // Create workflow mutation with enhanced validation
  const createWorkflowMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      console.log('Creating workflow for tenant:', tenantId);
      
      // Validate tenant exists and is active
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, status')
        .eq('id', tenantId)
        .single();
      
      if (tenantError || !tenant) {
        throw new Error('Invalid tenant selected');
      }
      
      if (tenant.status !== 'active') {
        throw new Error('Tenant must be active to start onboarding');
      }

      // Check if workflow already exists
      const { data: existing } = await supabase
        .from('onboarding_workflows')
        .select('id')
        .eq('tenant_id', tenantId)
        .single();
      
      if (existing) {
        throw new Error('Onboarding workflow already exists for this tenant');
      }

      // Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('onboarding_workflows')
        .insert([{
          tenant_id: tenantId,
          current_step: 1,
          total_steps: 6,
          status: 'in_progress',
          metadata: {
            started_by: 'super_admin',
            priority: 'normal',
            notifications_enabled: true
          }
        }])
        .select()
        .single();
      
      if (workflowError) {
        console.error('Workflow creation error:', workflowError);
        throw workflowError;
      }

      console.log('Workflow created:', workflow);

      // Create steps with enhanced data
      const stepsData = ONBOARDING_STEPS.map(step => ({
        workflow_id: workflow.id,
        step_number: step.number,
        step_name: step.name,
        step_status: step.number === 1 ? 'in_progress' as const : 'pending' as const,
        step_data: {
          description: step.description,
          estimated_duration: step.number * 0.5, // days
          requirements: []
        },
        validation_errors: []
      }));

      const { error: stepsError } = await supabase
        .from('onboarding_steps')
        .insert(stepsData);
      
      if (stepsError) {
        console.error('Steps creation error:', stepsError);
        throw stepsError;
      }
      
      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['available-tenants'] });
      toast.success('Onboarding workflow created successfully');
      setSelectedTenant('');
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('Create workflow error:', error);
      toast.error('Failed to create workflow: ' + error.message);
    }
  });

  // Update step status mutation with validation
  const updateStepMutation = useMutation({
    mutationFn: async ({ stepId, status }: { stepId: string; status: string }) => {
      const { data: step, error: stepError } = await supabase
        .from('onboarding_steps')
        .select('*, onboarding_workflows(*)')
        .eq('id', stepId)
        .single();
      
      if (stepError || !step) {
        throw new Error('Step not found');
      }

      // Validate status transition
      const validTransitions = {
        'pending': ['in_progress', 'skipped'],
        'in_progress': ['completed', 'failed', 'skipped'],
        'failed': ['in_progress', 'skipped'],
        'skipped': ['in_progress'],
        'completed': ['in_progress'] // Allow reopening if needed
      };

      if (!validTransitions[step.step_status as keyof typeof validTransitions]?.includes(status)) {
        throw new Error(`Invalid status transition from ${step.step_status} to ${status}`);
      }

      // Update step
      const stepData = step.step_data && typeof step.step_data === 'object' ? step.step_data : {};
      const { data, error } = await supabase
        .from('onboarding_steps')
        .update({ 
          step_status: status as any,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
          step_data: {
            ...stepData,
            last_updated: new Date().toISOString(),
            updated_by: 'super_admin'
          }
        })
        .eq('id', stepId)
        .select()
        .single();
      
      if (error) throw error;

      // Update workflow progress if step is completed
      if (status === 'completed') {
        const { data: allSteps } = await supabase
          .from('onboarding_steps')
          .select('step_status')
          .eq('workflow_id', step.workflow_id);
        
        const completedSteps = allSteps?.filter(s => s.step_status === 'completed').length || 0;
        const nextStep = Math.min(completedSteps + 1, 6);
        
        const workflowStatus = completedSteps === 6 ? 'completed' : 'in_progress';
        
        const workflowMetadata = step.onboarding_workflows.metadata && typeof step.onboarding_workflows.metadata === 'object' 
          ? step.onboarding_workflows.metadata 
          : {};
        
        await supabase
          .from('onboarding_workflows')
          .update({ 
            current_step: nextStep,
            status: workflowStatus,
            completed_at: workflowStatus === 'completed' ? new Date().toISOString() : null,
            metadata: {
              ...workflowMetadata,
              last_step_completed: new Date().toISOString(),
              completion_percentage: Math.round((completedSteps / 6) * 100)
            }
          })
          .eq('id', step.workflow_id);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-steps'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflows'] });
      toast.success('Step updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update step: ' + error.message);
    }
  });

  // Update workflow status mutation
  const updateWorkflowStatusMutation = useMutation({
    mutationFn: async ({ workflowId, status }: { workflowId: string; status: string }) => {
      const { data, error } = await supabase
        .from('onboarding_workflows')
        .update({ 
          status,
          metadata: {
            status_updated_at: new Date().toISOString(),
            updated_by: 'super_admin'
          }
        })
        .eq('id', workflowId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflows'] });
      toast.success('Workflow status updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update workflow: ' + error.message);
    }
  });

  // Filter workflows based on search and status
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.tenants?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.tenants?.owner_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRefresh = () => {
    refetchWorkflows();
    if (selectedWorkflow) {
      refetchSteps();
    }
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Verifying admin permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenant Onboarding</h1>
          <p className="text-muted-foreground">Manage tenant onboarding workflows and progress</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Start Onboarding
          </Button>
        </div>
      </div>

      {/* Analytics */}
      <OnboardingAnalytics workflows={workflows} />

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by tenant name or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Workflows ({workflows.filter(w => w.status !== 'completed').length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({workflows.filter(w => w.status === 'completed').length})</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {workflowsLoading ? (
            <div className="text-center py-8">Loading workflows...</div>
          ) : (
            <div className="grid gap-4">
              {filteredWorkflows.filter(w => w.status !== 'completed').map((workflow) => (
                <OnboardingWorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onSelect={setSelectedWorkflow}
                  onStatusChange={(workflowId, status) => 
                    updateWorkflowStatusMutation.mutate({ workflowId, status })
                  }
                />
              ))}
              {filteredWorkflows.filter(w => w.status !== 'completed').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No active workflows found
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-4">
            {filteredWorkflows.filter(w => w.status === 'completed').map((workflow) => (
              <OnboardingWorkflowCard
                key={workflow.id}
                workflow={workflow}
                onSelect={setSelectedWorkflow}
                onStatusChange={(workflowId, status) => 
                  updateWorkflowStatusMutation.mutate({ workflowId, status })
                }
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Active Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{workflows.filter(w => w.status !== 'completed').length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Completed This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {workflows.filter(w => 
                    w.status === 'completed' && 
                    w.completed_at && 
                    new Date(w.completed_at).getMonth() === new Date().getMonth()
                  ).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {workflows.length > 0 ? 
                    Math.round((workflows.filter(w => w.status === 'completed').length / workflows.length) * 100) : 0
                  }%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Workflow Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Onboarding</DialogTitle>
            <DialogDescription>Select a tenant to begin the onboarding process</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tenant-select">Select Tenant</Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tenant..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{tenant.name}</span>
                        <span className="text-sm text-gray-500">
                          {tenant.owner_name} • {tenant.subscription_plan}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => selectedTenant && createWorkflowMutation.mutate(selectedTenant)}
              disabled={!selectedTenant || createWorkflowMutation.isPending}
              className="w-full"
            >
              {createWorkflowMutation.isPending ? 'Creating...' : 'Start Onboarding'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workflow Details Dialog */}
      {selectedWorkflow && (
        <Dialog open={!!selectedWorkflow} onOpenChange={() => setSelectedWorkflow(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedWorkflow.tenants?.name || 'Unknown Tenant'} - Onboarding Progress
              </DialogTitle>
              <DialogDescription>
                Track and manage onboarding steps • Started {new Date(selectedWorkflow.started_at).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {stepsLoading ? (
                <div className="text-center py-4">Loading steps...</div>
              ) : (
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <OnboardingStepCard
                      key={step.id}
                      step={step}
                      onUpdateStep={(stepId, status) => 
                        updateStepMutation.mutate({ stepId, status })
                      }
                      isActive={step.step_status === 'in_progress'}
                    />
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
