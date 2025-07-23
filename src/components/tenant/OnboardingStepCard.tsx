
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Play, RotateCcw, FileText, Users, Settings, Database, Palette, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface OnboardingStepCardProps {
  step: {
    id: string;
    step_number: number;
    step_name: string;
    step_status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
    step_data: Record<string, any>;
    validation_errors: any[];
    completed_at: string | null;
    created_at: string;
    updated_at: string;
  };
  onUpdateStep: (stepId: string, status: string) => void;
  isActive: boolean;
}

const STEP_ICONS = {
  1: FileText,
  2: Shield,
  3: Palette,
  4: Settings,
  5: Database,
  6: Users,
};

const STEP_DESCRIPTIONS = {
  1: 'Verify business documents and compliance requirements',
  2: 'Configure subscription plan and billing settings',
  3: 'Customize branding, colors, and visual identity',
  4: 'Select features and configure system limits',
  5: 'Import existing data and set up integrations',
  6: 'Invite team members and configure permissions',
};

export const OnboardingStepCard: React.FC<OnboardingStepCardProps> = ({
  step,
  onUpdateStep,
  isActive
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'in_progress': return 'bg-blue-500 text-white';
      case 'failed': return 'bg-red-500 text-white';
      case 'skipped': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4 animate-pulse" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const StepIcon = STEP_ICONS[step.step_number as keyof typeof STEP_ICONS] || Settings;

  return (
    <Card className={`transition-all duration-200 ${isActive ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Step Icon */}
          <div className={`p-3 rounded-full ${
            step.step_status === 'completed' ? 'bg-green-100 text-green-600' :
            step.step_status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
            step.step_status === 'failed' ? 'bg-red-100 text-red-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            <StepIcon className="w-5 h-5" />
          </div>

          {/* Step Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-900">
                  {step.step_number}. {step.step_name}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {STEP_DESCRIPTIONS[step.step_number as keyof typeof STEP_DESCRIPTIONS]}
                </p>
              </div>
              <Badge className={getStatusColor(step.step_status)}>
                {getStatusIcon(step.step_status)}
                <span className="ml-1 capitalize">{step.step_status}</span>
              </Badge>
            </div>

            {/* Step Details */}
            <div className="space-y-2">
              {step.completed_at && (
                <div className="text-xs text-gray-500">
                  Completed {formatDistanceToNow(new Date(step.completed_at))} ago
                </div>
              )}

              {step.validation_errors && step.validation_errors.length > 0 && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  <strong>Validation Errors:</strong>
                  <ul className="mt-1 list-disc list-inside">
                    {step.validation_errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {step.step_data && Object.keys(step.step_data).length > 0 && (
                <div className="text-xs text-gray-600">
                  <strong>Progress:</strong> {Object.keys(step.step_data).length} items configured
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-3">
              {step.step_status === 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateStep(step.id, 'in_progress')}
                  className="text-xs"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Start
                </Button>
              )}
              
              {step.step_status === 'in_progress' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onUpdateStep(step.id, 'completed')}
                    className="text-xs"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdateStep(step.id, 'skipped')}
                    className="text-xs"
                  >
                    Skip
                  </Button>
                </>
              )}
              
              {step.step_status === 'failed' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateStep(step.id, 'in_progress')}
                  className="text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
