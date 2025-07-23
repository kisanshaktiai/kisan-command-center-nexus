
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertCircle, Play, Pause, User, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface OnboardingWorkflowCardProps {
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
      owner_name?: string;
      subscription_plan?: string;
    };
  };
  onSelect: (workflow: any) => void;
  onStatusChange: (workflowId: string, status: string) => void;
}

export const OnboardingWorkflowCard: React.FC<OnboardingWorkflowCardProps> = ({
  workflow,
  onSelect,
  onStatusChange
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 hover:bg-green-600';
      case 'in_progress': return 'bg-blue-500 hover:bg-blue-600';
      case 'paused': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'failed': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const calculateProgress = () => {
    return Math.round((workflow.current_step / workflow.total_steps) * 100);
  };

  const getEstimatedCompletion = () => {
    const avgStepTime = 2; // days per step
    const remainingSteps = workflow.total_steps - workflow.current_step;
    return remainingSteps * avgStepTime;
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {workflow.tenants?.name || 'Unknown Tenant'}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {workflow.tenants?.owner_name || 'No owner'}
              </span>
              <Badge variant="outline" className="text-xs">
                {workflow.tenants?.subscription_plan || 'No plan'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(workflow.status)}>
              {getStatusIcon(workflow.status)}
              <span className="ml-1 capitalize">{workflow.status}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Progress
              </span>
              <span className="text-sm text-gray-600">
                Step {workflow.current_step} of {workflow.total_steps}
              </span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
            <div className="text-xs text-gray-500">
              {calculateProgress()}% complete
            </div>
          </div>

          {/* Timeline Section */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Started {formatDistanceToNow(new Date(workflow.started_at))} ago</span>
            </div>
            {workflow.status === 'in_progress' && (
              <div className="text-blue-600">
                ~{getEstimatedCompletion()} days remaining
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelect(workflow)}
              className="flex-1"
            >
              View Details
            </Button>
            {workflow.status === 'in_progress' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(workflow.id, 'paused')}
              >
                <Pause className="w-4 h-4" />
              </Button>
            )}
            {workflow.status === 'paused' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(workflow.id, 'in_progress')}
              >
                <Play className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
