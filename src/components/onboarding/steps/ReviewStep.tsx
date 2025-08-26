
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, FileText, Users, Globe, Palette, Play } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface ReviewStepProps {
  stepData: any;
  allStepsData: any[];
  onComplete: (data: any) => void;
  onNext: () => void;
  isCompleted: boolean;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  stepData,
  allStepsData,
  onComplete,
  onNext,
  isCompleted
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(stepData?.terms_accepted || false);
  const { showSuccess, showError } = useNotifications();

  const getStepIcon = (stepName: string) => {
    switch (stepName.toLowerCase()) {
      case 'business verification':
        return FileText;
      case 'team setup':
        return Users;
      case 'domain setup':
        return Globe;
      case 'white-label setup':
        return Palette;
      default:
        return CheckCircle;
    }
  };

  const getStepSummary = (step: any) => {
    switch (step.step_name.toLowerCase()) {
      case 'business verification':
        return {
          title: 'Business Documents',
          details: [
            step.step_data?.gst_number ? `GST: ${step.step_data.gst_number}` : 'GST: Not provided',
            step.step_data?.pan_number ? `PAN: ${step.step_data.pan_number}` : 'PAN: Not provided',
            step.step_data?.business_registration ? `Registration: ${step.step_data.business_registration}` : 'Registration: Not provided'
          ]
        };
      case 'team setup':
        return {
          title: 'Team Members',
          details: [
            `${step.step_data?.team_size || 0} team members configured`,
            `${step.step_data?.admin_count || 0} administrators`,
            `Team invitations: ${step.step_data?.team_members?.filter((m: any) => m.status === 'invited').length || 0} sent`
          ]
        };
      case 'domain setup':
        return {
          title: 'Domain Configuration',
          details: [
            `Type: ${step.step_data?.domain_type || 'Not configured'}`,
            step.step_data?.subdomain ? `Subdomain: ${step.step_data.subdomain}.yourdomain.com` : 'Subdomain: Not set',
            step.step_data?.custom_domain ? `Custom: ${step.step_data.custom_domain}` : 'Custom domain: Not set',
            `Status: ${step.step_data?.domain_status || 'Pending'}`
          ]
        };
      case 'white-label setup':
        return {
          title: 'Brand Customization',
          details: [
            `App Name: ${step.step_data?.app_name || 'Not set'}`,
            `Tagline: ${step.step_data?.tagline || 'Not set'}`,
            `Colors: ${step.step_data?.primary_color ? 'Configured' : 'Default'}`,
            `Logo: ${step.step_data?.logo_url ? 'Uploaded' : 'Not uploaded'}`
          ]
        };
      default:
        return {
          title: step.step_name,
          details: ['Configuration completed']
        };
    }
  };

  const completedSteps = allStepsData.filter(step => step.step_status === 'completed');
  const totalSteps = allStepsData.length;
  const completionPercentage = Math.round((completedSteps.length / totalSteps) * 100);

  const handleLaunchApplication = async () => {
    if (!termsAccepted) {
      showError('Please accept the terms and conditions to proceed');
      return;
    }

    if (completedSteps.length < totalSteps) {
      showError('Please complete all onboarding steps before launching');
      return;
    }

    setIsLoading(true);
    try {
      const completionData = {
        terms_accepted: termsAccepted,
        launch_date: new Date().toISOString(),
        completion_percentage: 100,
        all_steps_completed: true,
        review_completed_at: new Date().toISOString(),
      };

      await onComplete(completionData);
      showSuccess('Application launched successfully! 🚀');
      onNext();
    } catch (error) {
      showError('Failed to launch application');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Onboarding Complete! 🎉
          </CardTitle>
          <CardDescription>Your application has been successfully launched</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="text-6xl">🚀</div>
            <div>
              <h3 className="text-xl font-semibold">Welcome to your new application!</h3>
              <p className="text-muted-foreground mt-2">
                All systems are ready and your team can start using the platform.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">100%</div>
                <div className="text-sm text-muted-foreground">Setup Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stepData?.team_size || 0}</div>
                <div className="text-sm text-muted-foreground">Team Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">Ready</div>
                <div className="text-sm text-muted-foreground">To Launch</div>
              </div>
            </div>
            <Button size="lg" onClick={() => window.location.href = '/dashboard'}>
              <Play className="w-5 h-5 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Review & Launch
        </CardTitle>
        <CardDescription>
          Review your configuration and launch your application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">{completionPercentage}%</div>
          <div className="text-muted-foreground">Setup Complete</div>
          <div className="w-full bg-muted rounded-full h-2 mt-4">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Configuration Summary</h4>
          {allStepsData.map((step, index) => {
            const StepIcon = getStepIcon(step.step_name);
            const isCompleted = step.step_status === 'completed';
            const summary = getStepSummary(step);

            return (
              <Card key={index} className={isCompleted ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-100' : 'bg-orange-100'}`}>
                      <StepIcon className={`w-5 h-5 ${isCompleted ? 'text-green-600' : 'text-orange-600'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{summary.title}</h5>
                        <Badge variant={isCompleted ? 'default' : 'secondary'}>
                          {isCompleted ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complete
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Incomplete
                            </>
                          )}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {summary.details.map((detail, detailIndex) => (
                          <p key={detailIndex} className="text-sm text-muted-foreground">
                            • {detail}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {completedSteps.length < totalSteps && (
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900">Incomplete Steps</h4>
                <p className="text-sm text-orange-800 mt-1">
                  Please complete all onboarding steps before launching your application.
                  You have {totalSteps - completedSteps.length} step(s) remaining.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                I accept the terms and conditions
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                By checking this box, you agree to our{' '}
                <a href="/terms" className="text-primary hover:underline">Terms of Service</a>{' '}
                and{' '}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button 
            size="lg"
            onClick={handleLaunchApplication}
            disabled={isLoading || !termsAccepted || completedSteps.length < totalSteps}
            className="px-8"
          >
            {isLoading ? (
              'Launching...'
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Launch Application
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            This will activate your application and make it available to your team
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
