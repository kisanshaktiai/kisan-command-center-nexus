import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, Clock, AlertCircle, Play, Pause, RotateCcw, RefreshCw, Wand2 } from 'lucide-react';
import { OptimizedTenantOnboardingWizard } from '@/components/onboarding/OptimizedTenantOnboardingWizard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '@/hooks/useNotifications';

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
    type: string;
    subscription_plan: string;
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

interface AvailableTenant {
  id: string;
  name: string;
  status: string;
  subscription_plan: string;
}

interface OnboardingStatusResponse {
  workflow_exists: boolean;
  workflow_status?: string;
  current_step?: number;
  total_steps?: number;
  progress_percentage?: number;
  next_pending_step?: any;
  workflow_id?: string;
  steps?: OnboardingStep[];
}

type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';

interface RpcResponse {
  success: boolean;
  error?: string;
  step_id?: string;
  new_status?: string;
  workflow_updated?: boolean;
}

// Type guard to check if response is a valid RpcResponse
function isRpcResponse(data: any): data is RpcResponse {
  return data && typeof data === 'object' && typeof data.success === 'boolean';
}

export default function TenantOnboarding() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardTenantId, setWizardTenantId] = useState<string>('');
  const [wizardWorkflowId, setWizardWorkflowId] = useState<string>('');
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();

  // Fetch onboarding workflows
  const { data: workflows = [], isLoading: workflowsLoading, refetch: refetchWorkflows } = useQuery({
    queryKey: ['onboarding-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_workflows')
        .select(`
          *,
          tenants(name, status, type, subscription_plan)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OnboardingWorkflow[];
    }
  });

  // Fetch onboarding steps for selected workflow
  const { data: steps = [], isLoading: stepsLoading } = useQuery({
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
    enabled: !!selectedWorkflow?.id
  });

  // Fetch available tenants
  const { data: availableTenants = [], isLoading: tenantsLoading, refetch: refetchTenants } = useQuery({
    queryKey: ['available-tenants'],
    queryFn: async () => {
      // Use direct query instead of RPC to avoid TypeScript issues
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, status, subscription_plan')
        .not('status', 'in', '(suspended,archived)')
        .order('name');
      
      if (error) throw error;
      
      // Filter out tenants that already have active workflows
      const { data: existingWorkflows } = await supabase
        .from('onboarding_workflows')
        .select('tenant_id')
        .not('status', 'eq', 'completed');
      
      const existingTenantIds = new Set(existingWorkflows?.map(w => w.tenant_id) || []);
      
      return (data as AvailableTenant[]).filter(tenant => !existingTenantIds.has(tenant.id));
    }
  });

  // Create onboarding workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      // Validate tenantId
      if (!tenantId || tenantId.trim() === '') {
        throw new Error('Invalid tenant ID provided');
      }

      console.log('Starting onboarding workflow for tenant:', tenantId);
      
      const { data, error } = await supabase.rpc('start_onboarding_workflow' as any, {
        p_tenant_id: tenantId,
        p_force_new: false,
      });
      
      if (error) {
        console.error('RPC error:', error);
        throw new Error(`Failed to start workflow: ${error.message}`);
      }
      
      console.log('Workflow creation result:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['available-tenants'] });
      showSuccess('Onboarding workflow started successfully');
      setSelectedTenant('');
      setShowCreateDialog(false);
    },
    onError: (error: any) => {
      console.error('Error starting workflow:', error);
      showError('Failed to start workflow', {
        description: error.message || 'Please try again later or contact support if the problem persists.'
      });
    }
  });

  // Restart workflow mutation
  const restartWorkflowMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      // Validate tenantId
      if (!tenantId || tenantId.trim() === '') {
        throw new Error('Invalid tenant ID provided');
      }

      console.log('Restarting onboarding workflow for tenant:', tenantId);
      
      const { data, error } = await supabase.rpc('start_onboarding_workflow' as any, {
        p_tenant_id: tenantId,
        p_force_new: true,
      });
      
      if (error) {
        console.error('RPC error:', error);
        throw new Error(`Failed to restart workflow: ${error.message}`);
      }
      
      console.log('Workflow restart result:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-steps'] });
      showSuccess('New onboarding workflow started');
      setSelectedWorkflow(null);
    },
    onError: (error: any) => {
      console.error('Error restarting workflow:', error);
      showError('Failed to restart workflow', {
        description: error.message || 'Please try again later or contact support if the problem persists.'
      });
    }
  });

  // Update step status mutation with corrected types
  const updateStepMutation = useMutation({
    mutationFn: async ({ stepId, status, stepData = {} }: { stepId: string; status: StepStatus; stepData?: Record<string, any> }) => {
      // Validate inputs
      if (!stepId || stepId.trim() === '') {
        throw new Error('Invalid step ID provided');
      }
      
      if (!status || status.trim() === '') {
        throw new Error('Invalid status provided');
      }

      // Ensure stepData is a valid JSON object
      const validStepData = stepData && typeof stepData === 'object' ? stepData : {};

      console.log('Updating step:', { stepId, status, stepData: validStepData });

      // Call the RPC function
      const { data, error } = await supabase.rpc('advance_onboarding_step', {
        p_step_id: stepId,
        p_new_status: status, // Now properly typed as StepStatus
        p_step_data: validStepData
      });
      
      if (error) {
        console.error('RPC error:', error);
        throw new Error(`Failed to update step: ${error.message}`);
      }

      // Safe type conversion with type guard
      if (!isRpcResponse(data)) {
        console.error('Unexpected response format:', data);
        throw new Error('Unexpected response format from server');
      }
      
      // Check if the function returned an error in the data
      if (data.success === false) {
        throw new Error(data.error || 'Unknown error occurred');
      }
      
      console.log('Step update result:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-steps'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflows'] });
      showSuccess('Step updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating step:', error);
      showError('Failed to update step', {
        description: error.message || 'Please try again later or contact support if the problem persists.'
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'skipped': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const calculateProgress = (workflow: OnboardingWorkflow) => {
    if (workflow.total_steps === 0) return 0;
    return Math.round((workflow.current_step / workflow.total_steps) * 100);
  };

  const canStartStep = (step: OnboardingStep) => {
    return step.step_status === 'pending' && 
           (step.step_number === 1 || 
            steps.some(s => s.step_number === step.step_number - 1 && s.step_status === 'completed'));
  };

  const canCompleteStep = (step: OnboardingStep) => {
    return step.step_status === 'in_progress';
  };

  const handleRefreshTenants = () => {
    refetchTenants();
    showSuccess('Tenant list refreshed');
  };

  const handleStartOnboarding = (tenantId: string) => {
    setWizardTenantId(tenantId);
    setShowWizard(true);
    
    // If there's an existing workflow, pass it to the wizard
    const existingWorkflow = workflows.find(w => w.tenant_id === tenantId);
    if (existingWorkflow) {
      setWizardWorkflowId(existingWorkflow.id);
    }
  };

  const handleCreateAndStartOnboarding = async () => {
    if (!selectedTenant) return;
    
    try {
      const result = await createWorkflowMutation.mutateAsync(selectedTenant);
      if (result) {
        setShowCreateDialog(false);
        setSelectedTenant('');
        // Start the wizard immediately after creating workflow
        handleStartOnboarding(selectedTenant);
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenant Onboarding</h1>
          <p className="text-muted-foreground">Manage tenant onboarding workflows with our world-class wizard</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Wand2 className="w-4 h-4 mr-2" />
              Start Smart Onboarding
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Enhanced Onboarding</DialogTitle>
              <DialogDescription>Select a tenant to begin the comprehensive onboarding experience</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Select Tenant</label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshTenants}
                  disabled={tenantsLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${tenantsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {tenantsLoading ? (
                <div className="text-center py-4">Loading tenants...</div>
              ) : availableTenants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No tenants available for onboarding</p>
                  <p className="text-sm mt-2">All eligible tenants may already have active workflows</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefreshTenants}
                    className="mt-2"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh List
                  </Button>
                </div>
              ) : (
                <>
                  <select
                    className="w-full mt-1 p-2 border rounded-md"
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                  >
                    <option value="">Choose a tenant...</option>
                    {availableTenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.subscription_plan}) - {tenant.status}
                      </option>
                    ))}
                  </select>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-sm text-blue-900">Enhanced Onboarding Features:</h4>
                    <ul className="text-xs text-blue-800 mt-1 space-y-1">
                      <li>• Interactive step-by-step wizard</li>
                      <li>• Real-time validation and verification</li>
                      <li>• Smart automation and integrations</li>
                      <li>• Professional branding setup</li>
                      <li>• Complete team and billing configuration</li>
                    </ul>
                  </div>
                  <Button
                    onClick={handleCreateAndStartOnboarding}
                    disabled={!selectedTenant || createWorkflowMutation.isPending}
                    className="w-full"
                  >
                    {createWorkflowMutation.isPending ? 'Starting...' : 'Start Enhanced Onboarding'}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Use Optimized Onboarding Wizard */}
      <OptimizedTenantOnboardingWizard
        isOpen={showWizard}
        onClose={() => {
          setShowWizard(false);
          setWizardTenantId('');
          setWizardWorkflowId('');
          // Refresh data after wizard closes
          refetchWorkflows();
        }}
        tenantId={wizardTenantId}
        workflowId={wizardWorkflowId}
      />

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Workflows</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {workflowsLoading ? (
            <div className="text-center py-8">Loading workflows...</div>
          ) : (
            <div className="grid gap-4">
              {workflows.filter(w => w.status !== 'completed').length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Wand2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">No active workflows found</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateDialog(true)}
                      className="mr-2"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Start Enhanced Onboarding
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                workflows.filter(w => w.status !== 'completed').map((workflow) => (
                  <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {workflow.tenants?.name || 'Unknown Tenant'}
                            <Badge variant="secondary" className="text-xs">
                              Enhanced
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            Started {new Date(workflow.started_at).toLocaleDateString()} • 
                            {workflow.tenants?.type} • {workflow.tenants?.subscription_plan}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(workflow.status)}>
                          {workflow.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{workflow.current_step}/{workflow.total_steps} steps</span>
                          </div>
                          <Progress value={calculateProgress(workflow)} className="h-2" />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleStartOnboarding(workflow.tenant_id)}
                          >
                            <Wand2 className="w-4 h-4 mr-2" />
                            Open Wizard
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedWorkflow(workflow)}
                          >
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => restartWorkflowMutation.mutate(workflow.tenant_id)}
                            disabled={restartWorkflowMutation.isPending}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restart
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-4">
            {workflows.filter(w => w.status === 'completed').map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{workflow.tenants?.name || 'Unknown Tenant'}</CardTitle>
                      <CardDescription>
                        Completed {workflow.completed_at ? new Date(workflow.completed_at).toLocaleDateString() : 'N/A'}
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-500">Completed</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Duration: {workflow.completed_at && workflow.started_at ? 
                      Math.ceil((new Date(workflow.completed_at).getTime() - new Date(workflow.started_at).getTime()) / (1000 * 60 * 60 * 24)) + ' days' : 'N/A'}
                  </div>
                </CardContent>
              </Card>
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
                <CardTitle>Average Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(() => {
                    const completedWorkflows = workflows.filter(w => w.completed_at && w.started_at);
                    if (completedWorkflows.length === 0) return 'N/A';
                    
                    const totalDays = completedWorkflows.reduce((acc, w) => {
                      const days = Math.ceil((new Date(w.completed_at!).getTime() - new Date(w.started_at).getTime()) / (1000 * 60 * 60 * 24));
                      return acc + days;
                    }, 0);
                    
                    return Math.round(totalDays / completedWorkflows.length) + ' days';
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Workflow Details Dialog */}
      {selectedWorkflow && (
        <Dialog open={!!selectedWorkflow} onOpenChange={() => setSelectedWorkflow(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle>{selectedWorkflow.tenants?.name || 'Unknown Tenant'} - Onboarding Progress</DialogTitle>
                  <DialogDescription>Track and manage onboarding steps</DialogDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => restartWorkflowMutation.mutate(selectedWorkflow.tenant_id)}
                  disabled={restartWorkflowMutation.isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {restartWorkflowMutation.isPending ? 'Restarting...' : 'Restart'}
                </Button>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {selectedWorkflow.current_step}/{selectedWorkflow.total_steps} steps
                  </span>
                </div>
                <Progress value={calculateProgress(selectedWorkflow)} className="h-2" />
              </div>
              
              {stepsLoading ? (
                <div className="text-center py-4">Loading steps...</div>
              ) : (
                <div className="space-y-3">
                  {steps.map((step) => (
                    <div key={step.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-full ${getStatusColor(step.step_status)} text-white`}>
                          {getStatusIcon(step.step_status)}
                        </div>
                        <div>
                          <h4 className="font-medium">{step.step_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {step.step_data?.description || 'No description available'}
                          </p>
                          {step.step_data?.estimated_time && (
                            <p className="text-xs text-muted-foreground">
                              Estimated time: {step.step_data.estimated_time} minutes
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(step.step_status)}>
                          {step.step_status}
                        </Badge>
                        {canCompleteStep(step) && (
                          <Button
                            size="sm"
                            onClick={() => updateStepMutation.mutate({ 
                              stepId: step.id, 
                              status: 'completed',
                              stepData: { completed_by: 'admin', completed_at: new Date().toISOString() }
                            })}
                            disabled={updateStepMutation.isPending}
                          >
                            Complete
                          </Button>
                        )}
                        {canStartStep(step) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStepMutation.mutate({ 
                              stepId: step.id, 
                              status: 'in_progress',
                              stepData: { started_by: 'admin', started_at: new Date().toISOString() }
                            })}
                            disabled={updateStepMutation.isPending}
                          >
                            Start
                          </Button>
                        )}
                      </div>
                    </div>
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
