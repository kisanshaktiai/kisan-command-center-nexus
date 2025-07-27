
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Clock, AlertCircle, Play, Pause, RotateCcw, MessageSquare, FileText, Zap, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SmartStepManagerProps {
  steps: Array<{
    id: string;
    workflow_id: string;
    step_number: number;
    step_name: string;
    step_status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
    step_data: Record<string, any>;
    validation_errors: any[];
    completed_at: string | null;
  }>;
  onStepUpdate: () => void;
}

export const SmartStepManager: React.FC<SmartStepManagerProps> = ({
  steps,
  onStepUpdate
}) => {
  const [updatingSteps, setUpdatingSteps] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});

  const updateStepStatus = async (stepId: string, status: string) => {
    setUpdatingSteps(prev => new Set(prev).add(stepId));
    
    try {
      const { error } = await supabase
        .from('onboarding_steps')
        .update({
          step_status: status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
          step_data: {
            ...steps.find(s => s.id === stepId)?.step_data,
            notes: notes[stepId] || '',
            last_updated: new Date().toISOString()
          }
        })
        .eq('id', stepId);

      if (error) throw error;

      toast.success(`Step ${status === 'completed' ? 'completed' : 'updated'} successfully`);
      onStepUpdate();
    } catch (error: any) {
      toast.error('Failed to update step: ' + error.message);
    } finally {
      setUpdatingSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStepProgress = (step: any) => {
    switch (step.step_status) {
      case 'completed': return 100;
      case 'in_progress': return 50;
      case 'failed': return 25;
      default: return 0;
    }
  };

  const getSmartRecommendations = (step: any) => {
    const recommendations = [];
    
    if (step.step_status === 'pending' && step.step_data?.required) {
      recommendations.push('This is a required step and should be prioritized');
    }
    
    if (step.step_data?.estimated_time > 60) {
      recommendations.push('Consider breaking this step into smaller tasks');
    }
    
    if (step.validation_errors?.length > 0) {
      recommendations.push('Review and fix validation errors before proceeding');
    }
    
    return recommendations;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold">Smart Step Management</h3>
      </div>

      {steps.map((step) => {
        const isUpdating = updatingSteps.has(step.id);
        const recommendations = getSmartRecommendations(step);
        
        return (
          <Card key={step.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{step.step_number}</span>
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {step.step_name}
                      {getStepIcon(step.step_status)}
                    </CardTitle>
                    {step.step_data?.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {step.step_data.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={step.step_status === 'completed' ? 'default' : 
                            step.step_status === 'in_progress' ? 'secondary' : 'outline'}
                    className="capitalize"
                  >
                    {step.step_status.replace('_', ' ')}
                  </Badge>
                  {step.step_data?.required && (
                    <Badge variant="destructive">Required</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span>{getStepProgress(step)}%</span>
                </div>
                <Progress value={getStepProgress(step)} className="h-2" />
              </div>

              {/* Smart Recommendations */}
              {recommendations.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">Smart Recommendations</span>
                  </div>
                  <ul className="space-y-1">
                    {recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-blue-600">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Validation Errors */}
              {step.validation_errors?.length > 0 && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">Validation Errors</span>
                  </div>
                  <ul className="space-y-1">
                    {step.validation_errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-600">• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Step Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Notes & Comments
                </label>
                <Textarea
                  placeholder="Add notes, comments, or additional information..."
                  value={notes[step.id] || step.step_data?.notes || ''}
                  onChange={(e) => setNotes(prev => ({ ...prev, [step.id]: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              {/* Timing Information */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {step.step_data?.estimated_time && (
                  <div>
                    <div className="text-muted-foreground">Estimated Time</div>
                    <div className="font-medium">{step.step_data.estimated_time} minutes</div>
                  </div>
                )}
                {step.completed_at && (
                  <div>
                    <div className="text-muted-foreground">Completed</div>
                    <div className="font-medium">
                      {new Date(step.completed_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {step.step_status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => updateStepStatus(step.id, 'in_progress')}
                    disabled={isUpdating}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Start
                  </Button>
                )}
                
                {step.step_status === 'in_progress' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateStepStatus(step.id, 'completed')}
                      disabled={isUpdating}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStepStatus(step.id, 'paused')}
                      disabled={isUpdating}
                    >
                      <Pause className="w-3 h-3 mr-1" />
                      Pause
                    </Button>
                  </>
                )}
                
                {step.step_status === 'failed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStepStatus(step.id, 'pending')}
                    disabled={isUpdating}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
                
                {!step.step_data?.required && step.step_status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStepStatus(step.id, 'skipped')}
                    disabled={isUpdating}
                  >
                    Skip
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
