
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
import { toast } from 'sonner';

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
  const queryClient = useQueryClient();

  // Fetch onboarding workflows
  const { data: workflows = [], isLoading: workflowsLoading } = useQuery({
    queryKey: ['onboarding-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_workflows')
        .select(`
          *,
          tenants(name, status)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OnboardingWorkflow[];
    }
  });

  // Fetch onboarding steps
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
      
      // Transform validation_errors from Json to any[]
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

  // Fetch tenants without workflows
  const { data: availableTenants = [] } = useQuery({
    queryKey: ['available-tenants'],
    queryFn: async () => {
      const { data: workflowData } = await supabase
        .from('onboarding_workflows')
        .select('tenant_id');
      
      const existingTenantIds = workflowData?.map(w => w.tenant_id) || [];
      
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name')
        .not('id', 'in', existingTenantIds.length > 0 ? `(${existingTenantIds.join(',')})` : '()')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    }
  });

  // Create onboarding workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      // Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('onboarding_workflows')
        .insert([{
          tenant_id: tenantId,
          current_step: 1,
          total_steps: 6,
          status: 'in_progress',
          metadata: {}
        }])
        .select()
        .single();
      
      if (workflowError) throw workflowError;

      // Create steps
      const stepsData = ONBOARDING_STEPS.map(step => ({
        workflow_id: workflow.id,
        step_number: step.number,
        step_name: step.name,
        step_status: step.number === 1 ? 'in_progress' as const : 'pending' as const,
        step_data: {},
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
      toast.success('Onboarding workflow created successfully');
      setSelectedTenant('');
    },
    onError: (error: any) => {
      toast.error('Failed to create workflow: ' + error.message);
    }
  });

  // Update step status mutation
  const updateStepMutation = useMutation({
    mutationFn: async ({ stepId, status }: { stepId: string; status: string }) => {
      const { data, error } = await supabase
        .from('onboarding_steps')
        .update({ 
          step_status: status as any,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', stepId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-steps'] });
      toast.success('Step updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update step: ' + error.message);
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
    return Math.round((workflow.current_step / workflow.total_steps) * 100);
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
                          Started {new Date(workflow.started_at).toLocaleDateString()}
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
                <div className="text-3xl font-bold">5.2 days</div>
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
                            {ONBOARDING_STEPS.find(s => s.number === step.step_number)?.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(step.step_status)}>
                          {step.step_status}
                        </Badge>
                        {step.step_status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() => updateStepMutation.mutate({ stepId: step.id, status: 'completed' })}
                          >
                            Complete
                          </Button>
                        )}
                        {step.step_status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStepMutation.mutate({ stepId: step.id, status: 'in_progress' })}
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
