
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, Clock, AlertCircle, Play, Pause, RotateCcw } from 'lucide-react';
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
}

interface RpcResponse {
  success: boolean;
  error?: string;
  step_id?: string;
  new_status?: string;
  workflow_id?: string;
}

export default function TenantOnboarding() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();

  // Fetch onboarding workflows
  const { data: workflows = [], isLoading: workflowsLoading } = useQuery({
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

  // Fetch available tenants using the new RPC function
  const { data: availableTenants = [] } = useQuery({
    queryKey: ['available-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_available_tenants_for_onboarding');
      if (error) throw error;
      return data as AvailableTenant[];
    }
  });

  // Create onboarding workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      // Get tenant details for template selection
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('type, subscription_plan')
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;

      // Get template steps from database function
      const { data: templateData, error: templateError } = await supabase
        .rpc('get_onboarding_template', {
          tenant_type: tenant.type,
          subscription_plan: tenant.subscription_plan
        });

      if (templateError) throw templateError;

      const steps = Array.isArray(templateData) ? templateData : [];
      
      // Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('onboarding_workflows')
        .insert([{
          tenant_id: tenantId,
          current_step: 1,
          total_steps: steps.length,
          status: 'in_progress',
          metadata: { tenant_type: tenant.type, subscription_plan: tenant.subscription_plan }
        }])
        .select()
        .single();
      
      if (workflowError) throw workflowError;

      // Create steps based on template
      const stepsData = steps.map((step: any, index: number) => ({
        workflow_id: workflow.id,
        step_number: step.step || index + 1,
        step_name: step.name,
        step_status: (step.step || index + 1) === 1 ? 'in_progress' as const : 'pending' as const,
        step_data: {
          description: step.description,
          required: step.required || true,
          estimated_time: step.estimated_time || 30
        },
        validation_errors: []
      }));

      const { error: stepsError } = await supabase
        .from('onboarding_steps')
        .insert(stepsData);
      
      if (stepsError) throw stepsError;
      
      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['available-tenants'] });
      showSuccess('Onboarding workflow created successfully');
      setSelectedTenant('');
    },
    onError: (error: any) => {
      console.error('Error creating workflow:', error);
      showError('Failed to create workflow: ' + error.message);
    }
  });

  // Update step status mutation using the new RPC function
  const updateStepMutation = useMutation({
    mutationFn: async ({ stepId, status }: { stepId: string; status: string }) => {
      const { data, error } = await supabase.rpc('advance_onboarding_step', {
        p_step_id: stepId,
        p_new_status: status
      });
      
      if (error) throw error;
      
      // Type assertion for the RPC response
      const response = data as RpcResponse;
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update step');
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-steps'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflows'] });
      showSuccess('Step updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating step:', error);
      showError('Failed to update step: ' + error.message);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenant Onboarding</h1>
          <p className="text-muted-foreground">Manage tenant onboarding workflows and progress</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Play className="w-4 h-4 mr-2" />
              Start Onboarding
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Onboarding</DialogTitle>
              <DialogDescription>Select a tenant to begin the onboarding process</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Tenant</label>
                <select
                  className="w-full mt-1 p-2 border rounded-md"
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                >
                  <option value="">Choose a tenant...</option>
                  {availableTenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
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
      </div>

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
              {workflows.filter(w => w.status !== 'completed').map((workflow) => (
                <Card key={workflow.id} className="cursor-pointer hover:shadow-md transition-shadow" 
                      onClick={() => setSelectedWorkflow(workflow)}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{workflow.tenants?.name || 'Unknown Tenant'}</CardTitle>
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
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{workflow.current_step}/{workflow.total_steps} steps</span>
                      </div>
                      <Progress value={calculateProgress(workflow)} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
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
              <DialogTitle>{selectedWorkflow.tenants?.name || 'Unknown Tenant'} - Onboarding Progress</DialogTitle>
              <DialogDescription>Track and manage onboarding steps</DialogDescription>
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
                            onClick={() => updateStepMutation.mutate({ stepId: step.id, status: 'completed' })}
                            disabled={updateStepMutation.isPending}
                          >
                            Complete
                          </Button>
                        )}
                        {canStartStep(step) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStepMutation.mutate({ stepId: step.id, status: 'in_progress' })}
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
