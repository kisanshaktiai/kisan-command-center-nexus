
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Play, 
  SkipForward,
  MessageSquare,
  Timer,
  FileText
} from 'lucide-react';
import { OnboardingStep } from '@/hooks/useOnboardingWorkflow';

interface OnboardingStepCardProps {
  step: OnboardingStep;
  stepNumber: number;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  onUpdateStatus: (status: OnboardingStep['step_status'], data?: Record<string, any>) => void;
  isUpdating: boolean;
}

export const OnboardingStepCard: React.FC<OnboardingStepCardProps> = ({
  step,
  stepNumber,
  isSelected,
  onSelectionChange,
  onUpdateStatus,
  isUpdating
}) => {
  const [notes, setNotes] = useState(step.step_data?.notes || '');
  const [showNotes, setShowNotes] = useState(false);

  const getStatusIcon = (status: OnboardingStep['step_status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: OnboardingStep['step_status']) => {
    const variants = {
      completed: 'default',
      in_progress: 'secondary',
      failed: 'destructive',
      skipped: 'outline',
      not_started: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const handleUpdateWithNotes = (status: OnboardingStep['step_status']) => {
    onUpdateStatus(status, {
      ...step.step_data,
      notes: notes.trim(),
      updated_at: new Date().toISOString()
    });
  };

  const canUpdate = ['not_started', 'in_progress', 'failed'].includes(step.step_status);
  const isRequired = step.onboarding_step_templates?.required !== false;

  return (
    <Card 
      className={`transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary shadow-md' : ''
      } ${step.step_status === 'completed' ? 'bg-green-50 border-green-200' : ''}`}
      role="listitem"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectionChange}
            className="mt-1"
            aria-label={`Select step ${stepNumber}`}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Step {stepNumber}
              </span>
              {getStatusIcon(step.step_status)}
              {getStatusBadge(step.step_status)}
              {isRequired && (
                <Badge variant="outline" className="text-xs">
                  Required
                </Badge>
              )}
            </div>
            
            <h3 className="font-semibold text-lg leading-tight">
              {step.step_name}
            </h3>
            
            {step.onboarding_step_templates?.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {step.onboarding_step_templates.description}
              </p>
            )}

            {step.onboarding_step_templates?.estimated_time_minutes && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Timer className="h-3 w-3" />
                Est. {step.onboarding_step_templates.estimated_time_minutes} minutes
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Validation Errors */}
        {step.validation_errors && step.validation_errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Validation Issues</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {step.validation_errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Step Data Display */}
        {step.step_data && Object.keys(step.step_data).length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-800">Step Data</span>
            </div>
            <div className="text-xs text-gray-700 space-y-1">
              {Object.entries(step.step_data).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span className="text-right">{JSON.stringify(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completion Info */}
        {step.completed_at && (
          <div className="mb-4 text-xs text-muted-foreground">
            Completed on {new Date(step.completed_at).toLocaleString()}
            {step.completed_by && ` by ${step.completed_by}`}
          </div>
        )}

        {/* Notes Section */}
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotes(!showNotes)}
            className="p-0 h-auto text-sm"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            {showNotes ? 'Hide' : 'Add'} Notes
          </Button>

          {showNotes && (
            <div className="space-y-2">
              <Label htmlFor={`notes-${step.id}`} className="text-sm">
                Admin Notes
              </Label>
              <Textarea
                id={`notes-${step.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this step..."
                className="min-h-20"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {canUpdate && (
          <div className="flex gap-2 mt-4 pt-3 border-t">
            {step.step_status === 'not_started' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateWithNotes('in_progress')}
                disabled={isUpdating}
              >
                <Play className="h-3 w-3 mr-1" />
                Start
              </Button>
            )}

            {['not_started', 'in_progress'].includes(step.step_status) && (
              <Button
                size="sm"
                onClick={() => handleUpdateWithNotes('completed')}
                disabled={isUpdating}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Button>
            )}

            {step.step_status !== 'failed' && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleUpdateWithNotes('failed')}
                disabled={isUpdating}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Mark Failed
              </Button>
            )}

            {!isRequired && step.step_status !== 'skipped' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateWithNotes('skipped')}
                disabled={isUpdating}
              >
                <SkipForward className="h-3 w-3 mr-1" />
                Skip
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
