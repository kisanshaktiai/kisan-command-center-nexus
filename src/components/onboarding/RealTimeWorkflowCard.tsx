
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertCircle, Play, Pause, RotateCcw, Zap } from 'lucide-react';

interface RealTimeWorkflowCardProps {
  workflow: {
    id: string;
    tenant_id: string;
    current_step: number;
    total_steps: number;
    status: string;
    started_at: string;
    completed_at: string | null;
    metadata: Record<string, any>;
    tenants?: {
      name: string;
      status: string;
      subscription_plan: string;
    };
  };
  onSelect: (workflow: any) => void;
  isSelected: boolean;
}

export const RealTimeWorkflowCard: React.FC<RealTimeWorkflowCardProps> = ({
  workflow,
  onSelect,
  isSelected
}) => {
  const calculateProgress = () => {
    return Math.round((workflow.current_step / workflow.total_steps) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getSubscriptionPlanColor = (plan: string) => {
    switch (plan) {
      case 'AI_Enterprise': return 'bg-purple-100 text-purple-800';
      case 'Shakti_Growth': return 'bg-blue-100 text-blue-800';
      case 'Kisan_Basic': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isIntelligentWorkflow = workflow.metadata?.created_by === 'intelligent_system';
  const estimatedTime = workflow.metadata?.estimated_completion_time;

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
      onClick={() => onSelect(workflow)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {workflow.tenants?.name || 'Unknown Tenant'}
              {isIntelligentWorkflow && (
                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700">
                  <Zap className="w-3 h-3 mr-1" />
                  AI-Generated
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStatusColor(workflow.status)}>
                {getStatusIcon(workflow.status)}
                <span className="ml-1 capitalize">{workflow.status}</span>
              </Badge>
              {workflow.tenants?.subscription_plan && (
                <Badge className={getSubscriptionPlanColor(workflow.tenants.subscription_plan)}>
                  {workflow.tenants.subscription_plan.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {workflow.current_step}/{workflow.total_steps} steps
            </span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {calculateProgress()}% complete
          </div>
        </div>

        {/* Timing Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Started</div>
            <div className="font-medium">
              {new Date(workflow.started_at).toLocaleDateString()}
            </div>
          </div>
          {estimatedTime && (
            <div>
              <div className="text-muted-foreground">Est. Time</div>
              <div className="font-medium">
                {Math.round(estimatedTime / 60)}h {estimatedTime % 60}m
              </div>
            </div>
          )}
        </div>

        {/* Completion Information */}
        {workflow.completed_at && (
          <div className="pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              Completed: {new Date(workflow.completed_at).toLocaleDateString()}
            </div>
            <div className="text-xs text-green-600 mt-1">
              Duration: {Math.ceil(
                (new Date(workflow.completed_at).getTime() - new Date(workflow.started_at).getTime()) / (1000 * 60 * 60 * 24)
              )} days
            </div>
          </div>
        )}

        {/* Action Buttons for Active Workflows */}
        {workflow.status === 'in_progress' && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="flex-1">
              <Play className="w-3 h-3 mr-1" />
              Continue
            </Button>
            <Button size="sm" variant="outline">
              <Pause className="w-3 h-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
