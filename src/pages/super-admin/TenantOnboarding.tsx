
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, Clock, Play, Users, Settings, Database, FileText, Palette, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardingWorkflow {
  id: string;
  tenant_id: string;
  current_step: number;
  total_steps: number;
  status: string;
  started_at: string;
  completed_at?: string;
  metadata: any;
  tenant_name?: string;
}

interface OnboardingStep {
  id: string;
  workflow_id: string;
  step_number: number;
  step_name: string;
  step_status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  step_data: any;
  validation_errors: any[];
  completed_at?: string;
}

export default function TenantOnboarding() {
  const [workflows, setWorkflows] = useState<OnboardingWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOnboarding, setShowNewOnboarding] = useState(false);

  useEffect(() => {
    fetchOnboardingWorkflows();
  }, []);

  const fetchOnboardingWorkflows = async () => {
    try {
      const { data: workflowsData, error: workflowsError } = await supabase
        .from('onboarding_workflows')
        .select(`
          *,
          tenants:tenant_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (workflowsError) throw workflowsError;

      const formattedWorkflows = workflowsData?.map(workflow => ({
        ...workflow,
        tenant_name: workflow.tenants?.name || 'Unknown Tenant'
      })) || [];

      setWorkflows(formattedWorkflows);
    } catch (error) {
      console.error('Error fetching onboarding workflows:', error);
      toast.error('Failed to load onboarding workflows');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflowSteps = async (workflowId: string) => {
    try {
      const { data, error } = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('step_number');

      if (error) throw error;
      setWorkflowSteps(data || []);
    } catch (error) {
      console.error('Error fetching workflow steps:', error);
      toast.error('Failed to load workflow steps');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const createNewOnboardingWorkflow = async (tenantId: string) => {
    try {
      const { data: workflow, error: workflowError } = await supabase
        .from('onboarding_workflows')
        .insert({
          tenant_id: tenantId,
          current_step: 1,
          total_steps: 6,
          status: 'in_progress',
          metadata: {}
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create default steps
      const steps = [
        { step_number: 1, step_name: 'Business Verification', step_status: 'in_progress' },
        { step_number: 2, step_name: 'Subscription Plan Selection', step_status: 'pending' },
        { step_number: 3, step_name: 'Branding Configuration', step_status: 'pending' },
        { step_number: 4, step_name: 'Feature Selection', step_status: 'pending' },
        { step_number: 5, step_name: 'Initial Data Import', step_status: 'pending' },
        { step_number: 6, step_name: 'Team Member Invites', step_status: 'pending' }
      ];

      const { error: stepsError } = await supabase
        .from('onboarding_steps')
        .insert(
          steps.map(step => ({
            workflow_id: workflow.id,
            ...step,
            step_data: {},
            validation_errors: []
          }))
        );

      if (stepsError) throw stepsError;

      toast.success('Onboarding workflow created successfully');
      fetchOnboardingWorkflows();
      setShowNewOnboarding(false);
    } catch (error) {
      console.error('Error creating onboarding workflow:', error);
      toast.error('Failed to create onboarding workflow');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Onboarding</h1>
          <p className="text-muted-foreground">
            Manage tenant onboarding workflows and white-label configurations
          </p>
        </div>
        <Dialog open={showNewOnboarding} onOpenChange={setShowNewOnboarding}>
          <DialogTrigger asChild>
            <Button>Start New Onboarding</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Onboarding</DialogTitle>
              <DialogDescription>
                Create a new onboarding workflow for a tenant
              </DialogDescription>
            </DialogHeader>
            <NewOnboardingForm onCreate={createNewOnboardingWorkflow} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflows">Onboarding Workflows</TabsTrigger>
          <TabsTrigger value="wizard">Onboarding Wizard</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          <OnboardingWorkflowsList 
            workflows={workflows}
            onSelectWorkflow={(workflow) => {
              setSelectedWorkflow(workflow);
              fetchWorkflowSteps(workflow.id);
            }}
          />
          
          {selectedWorkflow && (
            <WorkflowDetailsCard 
              workflow={selectedWorkflow}
              steps={workflowSteps}
            />
          )}
        </TabsContent>

        <TabsContent value="wizard" className="space-y-4">
          <OnboardingWizard />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <OnboardingTemplates />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OnboardingWorkflowsList({ workflows, onSelectWorkflow }: {
  workflows: OnboardingWorkflow[];
  onSelectWorkflow: (workflow: OnboardingWorkflow) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Onboarding Workflows</CardTitle>
        <CardDescription>
          Track and manage tenant onboarding progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflows.map((workflow) => (
              <TableRow key={workflow.id}>
                <TableCell className="font-medium">
                  {workflow.tenant_name}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(workflow.status)}>
                    {workflow.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={(workflow.current_step / workflow.total_steps) * 100} 
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                      {workflow.current_step}/{workflow.total_steps}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(workflow.started_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onSelectWorkflow(workflow)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function WorkflowDetailsCard({ workflow, steps }: {
  workflow: OnboardingWorkflow;
  steps: OnboardingStep[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Details - {workflow.tenant_name}</CardTitle>
        <CardDescription>
          Step-by-step onboarding progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center space-x-4 p-4 border rounded-lg">
              <div className="flex-shrink-0">
                {getStepStatusIcon(step.step_status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    Step {step.step_number}: {step.step_name}
                  </h4>
                  <Badge className={getStatusColor(step.step_status)}>
                    {step.step_status}
                  </Badge>
                </div>
                {step.validation_errors.length > 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    {step.validation_errors.join(', ')}
                  </div>
                )}
                {step.completed_at && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Completed: {new Date(step.completed_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function NewOnboardingForm({ onCreate }: { onCreate: (tenantId: string) => void }) {
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="tenant">Select Tenant</Label>
        <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a tenant" />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((tenant: any) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button 
        onClick={() => onCreate(selectedTenantId)}
        disabled={!selectedTenantId}
        className="w-full"
      >
        Start Onboarding
      </Button>
    </div>
  );
}

function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  const steps = [
    { id: 1, name: 'Business Verification', icon: FileText },
    { id: 2, name: 'Subscription Plan', icon: Database },
    { id: 3, name: 'Branding Setup', icon: Palette },
    { id: 4, name: 'Feature Selection', icon: Settings },
    { id: 5, name: 'Data Import', icon: Database },
    { id: 6, name: 'Team Invites', icon: Users }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Wizard</CardTitle>
          <CardDescription>
            Guide tenants through the complete onboarding process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Progress value={(currentStep / totalSteps) * 100} className="w-full" />
            
            <div className="flex justify-between">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div 
                    key={step.id}
                    className={`flex flex-col items-center space-y-2 ${
                      step.id <= currentStep ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${
                      step.id <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs text-center">{step.name}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-6">
              {currentStep === 1 && <BusinessVerificationStep />}
              {currentStep === 2 && <SubscriptionPlanStep />}
              {currentStep === 3 && <BrandingConfigurationStep />}
              {currentStep === 4 && <FeatureSelectionStep />}
              {currentStep === 5 && <DataImportStep />}
              {currentStep === 6 && <TeamInvitesStep />}
            </div>

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              <Button 
                onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                disabled={currentStep === totalSteps}
              >
                {currentStep === totalSteps ? 'Complete' : 'Next'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BusinessVerificationStep() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Business Verification</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="gst">GST Number</Label>
          <Input id="gst" placeholder="Enter GST number" />
        </div>
        <div>
          <Label htmlFor="pan">PAN Number</Label>
          <Input id="pan" placeholder="Enter PAN number" />
        </div>
        <div>
          <Label htmlFor="business-license">Business License</Label>
          <Input id="business-license" type="file" />
        </div>
        <div>
          <Label htmlFor="incorporation">Certificate of Incorporation</Label>
          <Input id="incorporation" type="file" />
        </div>
      </div>
    </div>
  );
}

function SubscriptionPlanStep() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select Subscription Plan</h3>
      <div className="grid grid-cols-3 gap-4">
        {['Basic', 'Premium', 'Enterprise'].map((plan) => (
          <Card key={plan} className="cursor-pointer hover:bg-accent">
            <CardHeader>
              <CardTitle className="text-center">{plan}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold mb-2">
                ${plan === 'Basic' ? '29' : plan === 'Premium' ? '99' : '299'}
                <span className="text-sm font-normal">/month</span>
              </div>
              <Button className="w-full">Select Plan</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BrandingConfigurationStep() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Branding Configuration</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="logo">Company Logo</Label>
          <Input id="logo" type="file" accept="image/*" />
        </div>
        <div>
          <Label htmlFor="primary-color">Primary Color</Label>
          <Input id="primary-color" type="color" />
        </div>
        <div>
          <Label htmlFor="app-name">Application Name</Label>
          <Input id="app-name" placeholder="Your App Name" />
        </div>
        <div>
          <Label htmlFor="custom-domain">Custom Domain</Label>
          <Input id="custom-domain" placeholder="app.yourcompany.com" />
        </div>
      </div>
    </div>
  );
}

function FeatureSelectionStep() {
  const features = [
    'Farmer Management',
    'Land Mapping',
    'Satellite Imagery',
    'Weather Forecasting',
    'Market Prices',
    'Analytics Dashboard',
    'Mobile App',
    'API Access'
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Feature Selection</h3>
      <div className="grid grid-cols-2 gap-4">
        {features.map((feature) => (
          <div key={feature} className="flex items-center space-x-2">
            <Switch id={feature} />
            <Label htmlFor={feature}>{feature}</Label>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataImportStep() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Initial Data Import</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="farmers-csv">Farmers Data (CSV)</Label>
          <Input id="farmers-csv" type="file" accept=".csv" />
        </div>
        <div>
          <Label htmlFor="products-csv">Products Data (CSV)</Label>
          <Input id="products-csv" type="file" accept=".csv" />
        </div>
        <div>
          <Label htmlFor="lands-csv">Lands Data (CSV)</Label>
          <Input id="lands-csv" type="file" accept=".csv" />
        </div>
      </div>
    </div>
  );
}

function TeamInvitesStep() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Invite Team Members</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" placeholder="user@company.com" />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button>Send Invite</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingTemplates() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Templates</CardTitle>
          <CardDescription>
            Pre-configured onboarding workflows for different tenant types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:bg-accent">
              <CardHeader>
                <CardTitle className="text-lg">Agriculture Company</CardTitle>
                <CardDescription>
                  Standard onboarding for agricultural organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Use Template</Button>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-accent">
              <CardHeader>
                <CardTitle className="text-lg">Dealer Network</CardTitle>
                <CardDescription>
                  Specialized workflow for dealer onboarding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Use Template</Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStepStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'in_progress':
      return <Play className="h-4 w-4 text-blue-600" />;
    case 'failed':
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}
