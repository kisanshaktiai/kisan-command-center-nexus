
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit2, CheckCircle2, Building, CreditCard, Palette, Settings, Users, FileText } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface OnboardingSummaryProps {
  onEdit: (stepIndex: number) => void;
  onComplete: () => void;
}

export const OnboardingSummary: React.FC<OnboardingSummaryProps> = ({ onEdit, onComplete }) => {
  const { steps, formData, workflow } = useOnboarding();

  const getStepIcon = (stepName: string) => {
    switch (stepName.toLowerCase().replace(/\s+/g, '')) {
      case 'businessverification':
        return <Building className="w-5 h-5" />;
      case 'planselection':
        return <CreditCard className="w-5 h-5" />;
      case 'branding':
        return <Palette className="w-5 h-5" />;
      case 'featuretoggles':
        return <Settings className="w-5 h-5" />;
      case 'teaminvites':
        return <Users className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const renderStepSummary = (step: any, stepIndex: number) => {
    const stepKey = step.step_name.toLowerCase().replace(/\s+/g, '');
    const data = formData[stepKey as keyof typeof formData] || {};

    if (Object.keys(data).length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No data entered for this step</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(stepIndex)}
            className="mt-2"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Add Information
          </Button>
        </div>
      );
    }

    switch (stepKey) {
      case 'businessverification':
        const businessData = data as any;
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Company Name</p>
                <p className="text-base">{businessData?.companyName || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">GST Number</p>
                <p className="text-base font-mono">{businessData?.gstNumber || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">PAN Number</p>
                <p className="text-base font-mono">{businessData?.panNumber || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Documents</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {businessData?.registrationCertificate && (
                    <Badge variant="outline">Registration Certificate</Badge>
                  )}
                  {businessData?.addressProof && (
                    <Badge variant="outline">Address Proof</Badge>
                  )}
                  {!businessData?.registrationCertificate && !businessData?.addressProof && (
                    <span className="text-sm text-gray-500">No documents uploaded</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'planselection':
        const planData = data as any;
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Selected Plan</p>
                <p className="text-base">
                  {planData?.planType?.replace('_', ' ') || 'Not selected'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Billing Cycle</p>
                <p className="text-base capitalize">
                  {planData?.billingCycle || 'Not selected'}
                </p>
              </div>
            </div>
            {planData?.addOns && planData.addOns.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Add-ons</p>
                <div className="flex flex-wrap gap-2">
                  {planData.addOns.map((addon: string, index: number) => (
                    <Badge key={index} variant="secondary">{addon}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'branding':
        const brandingData = data as any;
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Primary Color</p>
                <div className="flex items-center space-x-2 mt-1">
                  {brandingData?.primaryColor && (
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: brandingData.primaryColor }}
                    ></div>
                  )}
                  <p className="text-base font-mono">
                    {brandingData?.primaryColor || 'Not set'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Secondary Color</p>
                <div className="flex items-center space-x-2 mt-1">
                  {brandingData?.secondaryColor && (
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: brandingData.secondaryColor }}
                    ></div>
                  )}
                  <p className="text-base font-mono">
                    {brandingData?.secondaryColor || 'Not set'}
                  </p>
                </div>
              </div>
            </div>
            {brandingData?.companyDescription && (
              <div>
                <p className="text-sm font-medium text-gray-500">Company Description</p>
                <p className="text-base text-gray-700 mt-1">"{brandingData.companyDescription}"</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Logo</p>
              <p className="text-base">
                {brandingData?.logo ? 'Logo uploaded' : 'No logo uploaded'}
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-4 text-gray-500">
            <p>Summary not available for this step type</p>
          </div>
        );
    }
  };

  const completedSteps = steps.filter(step => step.step_status === 'completed').length;
  const totalSteps = steps.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          <h2 className="text-3xl font-bold text-gray-900">Review Your Setup</h2>
        </div>
        <p className="text-lg text-gray-600">
          Please review your information before completing the setup
        </p>
        
        {/* Progress Summary */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 inline-block">
          <p className="text-green-800 font-medium">
            {completedSteps} of {totalSteps} steps completed
          </p>
        </div>
      </div>

      {/* Step Summaries */}
      <div className="space-y-6">
        {steps.map((step, index) => (
          <Card key={step.id} className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStepIcon(step.step_name)}
                  <div>
                    <CardTitle className="text-lg">{step.step_name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge
                        variant={step.step_status === 'completed' ? 'default' : 'outline'}
                        className={step.step_status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {step.step_status === 'completed' ? 'Completed' : 'Incomplete'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(index)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {renderStepSummary(step, index)}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Final Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold text-blue-900">
            Ready to Complete Setup?
          </h3>
          <p className="text-blue-700">
            Once you complete the setup, you'll be redirected to your dashboard and can start using the platform.
          </p>
          
          <div className="flex justify-center space-x-4">
            <Button
              variant="outline"
              onClick={() => onEdit(0)}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              Review From Beginning
            </Button>
            <Button
              onClick={onComplete}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Complete Setup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
