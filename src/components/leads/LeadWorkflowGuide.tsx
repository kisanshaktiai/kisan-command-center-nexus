
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  CheckCircle2, 
  Circle, 
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import type { Lead } from '@/types/leads';

interface LeadWorkflowGuideProps {
  lead: Lead;
  className?: string;
}

const workflowSteps = [
  {
    status: 'new',
    title: 'New Lead',
    description: 'Lead has been created and needs assignment',
    nextActions: ['Assign to admin', 'Make initial contact'],
  },
  {
    status: 'assigned',
    title: 'Assigned',
    description: 'Lead assigned to admin for follow-up',
    nextActions: ['Contact the lead', 'Research background'],
  },
  {
    status: 'contacted',
    title: 'Contacted',
    description: 'Initial contact has been made',
    nextActions: ['Qualify the lead', 'Schedule follow-up'],
  },
  {
    status: 'qualified',
    title: 'Qualified',
    description: 'Lead meets criteria and shows interest',
    nextActions: ['Convert to tenant', 'Send proposal'],
  },
  {
    status: 'converted',
    title: 'Converted',
    description: 'Lead successfully converted to tenant',
    nextActions: ['Onboard new tenant'],
  },
  {
    status: 'rejected',
    title: 'Rejected',
    description: 'Lead did not meet criteria or declined',
    nextActions: ['Archive lead', 'Review for future'],
  },
];

export const LeadWorkflowGuide: React.FC<LeadWorkflowGuideProps> = ({
  lead,
  className,
}) => {
  const currentStepIndex = workflowSteps.findIndex(step => step.status === lead.status);
  const currentStep = workflowSteps[currentStepIndex];
  
  const getStepIcon = (stepIndex: number, currentIndex: number) => {
    if (stepIndex < currentIndex) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    } else if (stepIndex === currentIndex) {
      return <Circle className="h-4 w-4 text-blue-500 fill-blue-500" />;
    } else {
      return <Circle className="h-4 w-4 text-gray-300" />;
    }
  };

  const getRecommendations = () => {
    switch (lead.status) {
      case 'new':
        if (!lead.assigned_to) {
          return {
            type: 'warning',
            message: 'This lead needs to be assigned to an admin for follow-up.',
            actions: ['Assign Admin', 'Auto-assign']
          };
        }
        return {
          type: 'info',
          message: 'Lead is assigned. Make initial contact to move forward.',
          actions: ['Contact Lead', 'Update Status']
        };
      
      case 'assigned':
        return {
          type: 'info',
          message: 'Reach out to the lead via phone or email to begin qualification.',
          actions: ['Make Call', 'Send Email', 'Mark as Contacted']
        };
      
      case 'contacted':
        return {
          type: 'info',
          message: 'Assess if this lead meets your qualification criteria.',
          actions: ['Qualify Lead', 'Schedule Meeting', 'Mark as Qualified']
        };
      
      case 'qualified':
        return {
          type: 'success',
          message: 'Great! This lead is ready for conversion to tenant.',
          actions: ['Convert to Tenant', 'Send Proposal']
        };
      
      case 'converted':
        return {
          type: 'success',
          message: 'Congratulations! Lead has been converted successfully.',
          actions: ['View Tenant', 'Start Onboarding']
        };
      
      case 'rejected':
        return {
          type: 'neutral',
          message: 'Lead was rejected. Consider if it can be reactivated later.',
          actions: ['Reactivate', 'Archive Permanently']
        };
      
      default:
        return null;
    }
  };

  const recommendation = getRecommendations();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Workflow Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Circle className="h-4 w-4 text-blue-500 fill-blue-500" />
            <span className="font-medium text-blue-700">{currentStep?.title}</span>
          </div>
          <p className="text-sm text-blue-600">{currentStep?.description}</p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Progress Steps</h4>
          {workflowSteps.slice(0, 5).map((step, index) => ( // Exclude rejected from normal flow
            <div key={step.status} className="flex items-center gap-2">
              {getStepIcon(index, currentStepIndex)}
              <span className={`text-xs ${
                index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {step.title}
              </span>
              {index < 4 && index !== currentStepIndex && (
                <ArrowRight className="h-3 w-3 text-gray-300 ml-auto" />
              )}
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {recommendation && (
          <div className={`p-3 rounded-lg border ${
            recommendation.type === 'warning' 
              ? 'bg-orange-50 border-orange-200'
              : recommendation.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                recommendation.type === 'warning'
                  ? 'text-orange-500'
                  : recommendation.type === 'success'
                  ? 'text-green-500'
                  : 'text-blue-500'
              }`} />
              <div className="flex-1">
                <p className={`text-xs ${
                  recommendation.type === 'warning'
                    ? 'text-orange-700'
                    : recommendation.type === 'success'
                    ? 'text-green-700'
                    : 'text-blue-700'
                }`}>
                  {recommendation.message}
                </p>
                
                {/* Next Actions */}
                {currentStep?.nextActions && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-700 mb-1">Suggested Actions:</p>
                    <div className="flex flex-wrap gap-1">
                      {currentStep.nextActions.map((action, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Assignment Status */}
        {!lead.assigned_to && lead.status !== 'converted' && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-xs text-yellow-700">
                No admin assigned - lead may not receive attention
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
