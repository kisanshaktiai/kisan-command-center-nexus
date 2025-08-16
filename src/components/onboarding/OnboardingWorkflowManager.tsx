
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Play, 
  CheckCheck,
  Undo2,
  User,
  Calendar
} from 'lucide-react';
import { useOnboardingWorkflow, OnboardingStep } from '@/hooks/useOnboardingWorkflow';
import { OnboardingStepCard } from './OnboardingStepCard';
import { OnboardingProgressBar } from './OnboardingProgressBar';
import { BulkActionsToolbar } from './BulkActionsToolbar';

interface OnboardingWorkflowManagerProps {
  tenantId: string;
  tenantName?: string;
  className?: string;
}

export const OnboardingWorkflowManager: React.FC<OnboardingWorkflowManagerProps> = ({
  tenantId,
  tenantName,
  className
}) => {
  const {
    workflow,
    isLoading,
    error,
    updateStep,
    isUpdatingStep,
    completeWorkflow,
    isCompletingWorkflow,
    bulkUpdateSteps,
    isBulkUpdating
  } = useOnboardingWorkflow(tenantId);

  const [selectedSteps, setSelectedSteps] = useState<Set<string>>(new Set());
  const [lastBulkAction, setLastBulkAction] = useState<{
    stepIds: string[];
    previousStatus: OnboardingStep['step_status'];
    newStatus: OnboardingStep['step_status'];
  } | null>(null);

  const handleStepSelection = useCallback((stepId: string, selected: boolean) => {
    setSelectedSteps(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(stepId);
      } else {
        newSet.delete(stepId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!workflow?.onboarding_steps) return;
    
    const allStepIds = workflow.onboarding_steps.map(step => step.id);
    setSelectedSteps(new Set(allStepIds));
  }, [workflow?.onboarding_steps]);

  const handleDeselectAll = useCallback(() => {
    setSelectedSteps(new Set());
  }, []);

  const handleBulkApprove = useCallback(() => {
    if (selectedSteps.size === 0) return;
    
    const stepIds = Array.from(selectedSteps);
    const stepsToUpdate = workflow?.onboarding_steps.filter(step => 
      selectedSteps.has(step.id)
    ) || [];
    
    // Store previous states for undo
    setLastBulkAction({
      stepIds,
      previousStatus: stepsToUpdate[0]?.step_status || 'not_started',
      newStatus: 'completed'
    });

    bulkUpdateSteps({
      stepIds,
      status: 'completed',
      completedBy: 'admin' // TODO: Get actual admin ID
    });

    setSelectedSteps(new Set());
  }, [selectedSteps, workflow?.onboarding_steps, bulkUpdateSteps]);

  const handleBulkReject = useCallback(() => {
    if (selectedSteps.size === 0) return;
    
    const stepIds = Array.from(selectedSteps);
    const stepsToUpdate = workflow?.onboarding_steps.filter(step => 
      selectedSteps.has(step.id)
    ) || [];
    
    setLastBulkAction({
      stepIds,
      previousStatus: stepsToUpdate[0]?.step_status || 'not_started',
      newStatus: 'failed'
    });

    bulkUpdateSteps({
      stepIds,
      status: 'failed',
      completedBy: 'admin'
    });

    setSelectedSteps(new Set());
  }, [selectedSteps, workflow?.onboarding_steps, bulkUpdateSteps]);

  const handleUndo = useCallback(() => {
    if (!lastBulkAction) return;

    bulkUpdateSteps({
      stepIds: lastBulkAction.stepIds,
      status: lastBulkAction.previousStatus,
      completedBy: 'admin'
    });

    setLastBulkAction(null);
  }, [lastBulkAction, bulkUpdateSteps]);

  const calculateProgress = useCallback(() => {
    if (!workflow?.onboarding_steps.length) return 0;
    
    const completedSteps = workflow.onboarding_steps.filter(
      step => step.step_status === 'completed'
    ).length;
    
    return Math.round((completedSteps / workflow.onboarding_steps.length) * 100);
  }, [workflow?.onboarding_steps]);

  const canCompleteWorkflow = useCallback(() => {
    if (!workflow?.onboarding_steps.length) return false;
    
    const requiredSteps = workflow.onboarding_steps.filter(
      step => step.onboarding_step_templates?.required !== false
    );
    
    return requiredSteps.every(step => 
      step.step_status === 'completed' || step.step_status === 'skipped'
    );
  }, [workflow?.onboarding_steps]);

  if (isLoading) {
    return (
      <div className={className} role="status" aria-label="Loading onboarding workflow">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-2 w-full" />
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load onboarding workflow: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!workflow) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No onboarding workflow found for this tenant.
        </AlertDescription>
      </Alert>
    );
  }

  const progress = calculateProgress();

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {tenantName || 'Tenant'} Onboarding
              </CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Started: {workflow.started_at ? 
                    new Date(workflow.started_at).toLocaleDateString() : 
                    'Not started'
                  }
                </span>
                <Badge variant={
                  workflow.status === 'completed' ? 'default' :
                  workflow.status === 'in_progress' ? 'secondary' :
                  workflow.status === 'failed' ? 'destructive' : 'outline'
                }>
                  {workflow.status.replace('_', ' ')}
                </Badge>
              </CardDescription>
            </div>

            {canCompleteWorkflow() && workflow.status !== 'completed' && (
              <Button
                onClick={() => completeWorkflow(workflow.id)}
                disabled={isCompletingWorkflow}
                className="shrink-0"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isCompletingWorkflow ? 'Completing...' : 'Complete Workflow'}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Section */}
          <OnboardingProgressBar
            progress={progress}
            currentStep={workflow.current_step}
            totalSteps={workflow.total_steps}
            status={workflow.status}
          />

          {/* Bulk Actions */}
          {workflow.onboarding_steps.length > 0 && (
            <BulkActionsToolbar
              selectedCount={selectedSteps.size}
              totalCount={workflow.onboarding_steps.length}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onBulkApprove={handleBulkApprove}
              onBulkReject={handleBulkReject}
              canUndo={!!lastBulkAction}
              onUndo={handleUndo}
              isProcessing={isBulkUpdating}
            />
          )}

          {/* Steps List */}
          <div className="space-y-4" role="list" aria-label="Onboarding steps">
            {workflow.onboarding_steps.map((step, index) => (
              <OnboardingStepCard
                key={step.id}
                step={step}
                stepNumber={index + 1}
                isSelected={selectedSteps.has(step.id)}
                onSelectionChange={(selected) => handleStepSelection(step.id, selected)}
                onUpdateStatus={(status, data) => updateStep({
                  stepId: step.id,
                  status,
                  stepData: data,
                  completedBy: 'admin'
                })}
                isUpdating={isUpdatingStep}
              />
            ))}
          </div>

          {workflow.onboarding_steps.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No onboarding steps defined for this workflow.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
