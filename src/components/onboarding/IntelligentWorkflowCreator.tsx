
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IntelligentWorkflowCreatorProps {
  availableTenants: Array<{ id: string; name: string; subscription_plan: string }>;
  onWorkflowCreated: () => void;
}

export const IntelligentWorkflowCreator: React.FC<IntelligentWorkflowCreatorProps> = ({
  availableTenants,
  onWorkflowCreated
}) => {
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [workflowTemplate, setWorkflowTemplate] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleTenantSelect = async (tenantId: string) => {
    setSelectedTenant(tenantId);
    const tenant = availableTenants.find(t => t.id === tenantId);
    if (tenant) {
      // Generate intelligent workflow template
      const { data: template, error } = await supabase
        .rpc('get_onboarding_template', {
          tenant_type: 'standard',
          subscription_plan: tenant.subscription_plan
        });

      if (error) {
        toast.error('Failed to generate workflow template');
        return;
      }

      setWorkflowTemplate(template);
      setPreviewMode(true);
    }
  };

  const createIntelligentWorkflow = async () => {
    if (!selectedTenant || !workflowTemplate) return;

    setIsCreating(true);
    
    try {
      // Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('onboarding_workflows')
        .insert([{
          tenant_id: selectedTenant,
          current_step: 1,
          total_steps: workflowTemplate.length,
          status: 'in_progress',
          metadata: {
            created_by: 'intelligent_system',
            template_used: true,
            estimated_completion_time: workflowTemplate.reduce((sum: number, step: any) => sum + (step.estimated_time || 0), 0)
          }
        }])
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create steps
      const stepsData = workflowTemplate.map((step: any, index: number) => ({
        workflow_id: workflow.id,
        step_number: step.step,
        step_name: step.name,
        step_status: index === 0 ? 'in_progress' : 'pending',
        step_data: {
          description: step.description,
          required: step.required,
          estimated_time: step.estimated_time
        },
        validation_errors: []
      }));

      const { error: stepsError } = await supabase
        .from('onboarding_steps')
        .insert(stepsData);

      if (stepsError) throw stepsError;

      toast.success('Intelligent workflow created successfully!');
      onWorkflowCreated();
      setIsOpen(false);
      setSelectedTenant('');
      setWorkflowTemplate(null);
      setPreviewMode(false);
    } catch (error: any) {
      toast.error('Failed to create workflow: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const getTotalEstimatedTime = () => {
    if (!workflowTemplate) return 0;
    return workflowTemplate.reduce((sum: number, step: any) => sum + (step.estimated_time || 0), 0);
  };

  const getStepPriority = (step: any) => {
    if (step.required) return 'high';
    if (step.estimated_time > 60) return 'medium';
    return 'low';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
          <Sparkles className="w-4 h-4 mr-2" />
          Create Intelligent Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Intelligent Workflow Creator
          </DialogTitle>
          <DialogDescription>
            AI-powered workflow generation based on tenant type and subscription plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!previewMode ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Tenant</label>
                <Select value={selectedTenant} onValueChange={handleTenantSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a tenant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{tenant.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {tenant.subscription_plan}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Workflow Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Workflow Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {workflowTemplate?.length || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Steps</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(getTotalEstimatedTime() / 60)}h
                      </div>
                      <div className="text-sm text-muted-foreground">Estimated Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {workflowTemplate?.filter((s: any) => s.required).length || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Required Steps</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Steps Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Workflow Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workflowTemplate?.map((step: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">{step.step}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{step.name}</h4>
                            {step.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                            <Badge 
                              variant={getStepPriority(step) === 'high' ? 'destructive' : 
                                     getStepPriority(step) === 'medium' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {getStepPriority(step)} priority
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {step.estimated_time} min
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  onClick={() => setPreviewMode(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Back to Selection
                </Button>
                <Button 
                  onClick={createIntelligentWorkflow}
                  disabled={isCreating}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {isCreating ? 'Creating...' : 'Create Workflow'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
