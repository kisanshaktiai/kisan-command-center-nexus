import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle, Rocket, Eye, Settings } from 'lucide-react';

interface ReviewGoLiveStepProps {
  onComplete: (data: any) => void;
  onSave: (data: any) => void;
  tenantId: string;
  stepData?: any;
  isLoading?: boolean;
  canProceed?: boolean;
}

export const ReviewGoLiveStep: React.FC<ReviewGoLiveStepProps> = ({
  onComplete,
  onSave,
  tenantId,
  stepData = {},
  isLoading = false,
  canProceed = true
}) => {
  const [formData, setFormData] = useState({
    preflightChecksCompleted: stepData.preflightChecksCompleted || false,
    termsAccepted: stepData.termsAccepted || false,
    dataPrivacyAccepted: stepData.dataPrivacyAccepted || false,
    goLiveApproved: stepData.goLiveApproved || false,
    launchMode: stepData.launchMode || 'production', // 'staging' | 'production'
    notifications: stepData.notifications || {
      emailNotifications: true,
      smsNotifications: false,
      webhookNotifications: false
    },
    reviewNotes: stepData.reviewNotes || '',
    approved: stepData.approved || false,
    metadata: stepData.metadata || {}
  });

  const [preflightResults, setPreflightResults] = useState({
    loading: true,
    results: []
  });

  const preflightChecks = [
    {
      id: 'company_profile',
      name: 'Company Profile',
      description: 'Basic company information completed',
      status: 'completed',
      critical: true
    },
    {
      id: 'branding',
      name: 'Branding Configuration',
      description: 'Colors, logos, and visual identity set up',
      status: 'completed',
      critical: false
    },
    {
      id: 'users_roles',
      name: 'Users & Roles',
      description: 'Team members and permissions configured',
      status: 'completed',
      critical: true
    },
    {
      id: 'billing',
      name: 'Billing Setup',
      description: 'Subscription plan and payment method configured',
      status: 'warning',
      critical: true
    },
    {
      id: 'domain',
      name: 'Domain Configuration',
      description: 'Custom domain and DNS settings verified',
      status: 'pending',
      critical: false
    },
    {
      id: 'data_migration',
      name: 'Data Migration',
      description: 'Existing data imported successfully',
      status: 'completed',
      critical: false
    },
    {
      id: 'integrations',
      name: 'Third-party Integrations',
      description: 'External systems connected and tested',
      status: 'skipped',
      critical: false
    },
    {
      id: 'testing',
      name: 'System Testing',
      description: 'Core functionality tested and validated',
      status: 'completed',
      critical: true
    }
  ];

  const runPreflightChecks = async () => {
    setPreflightResults({ loading: true, results: [] });
    
    try {
      // Simulate preflight checks
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setPreflightResults({
        loading: false,
        results: preflightChecks
      });
      
      const allCriticalPassed = preflightChecks
        .filter(check => check.critical)
        .every(check => check.status === 'completed');
      
      setFormData(prev => ({
        ...prev,
        preflightChecksCompleted: allCriticalPassed
      }));
      
    } catch (error) {
      console.error('Error running preflight checks:', error);
      setPreflightResults({ loading: false, results: [] });
    }
  };

  useEffect(() => {
    runPreflightChecks();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(formData).some(key => formData[key] !== stepData[key])) {
        onSave(formData);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, onSave, stepData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-blue-100 text-blue-800',
      skipped: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800'
    };

    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const canGoLive = () => {
    return (
      formData.preflightChecksCompleted &&
      formData.termsAccepted &&
      formData.dataPrivacyAccepted &&
      !preflightResults.loading
    );
  };

  const handleGoLive = () => {
    const goLiveData = {
      ...formData,
      approved: true,
      goLiveDate: new Date().toISOString(),
      metadata: {
        ...formData.metadata,
        preflightResults: preflightResults.results,
        launchMode: formData.launchMode
      }
    };
    
    onComplete(goLiveData);
  };

  const handleSaveAndContinue = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Rocket className="w-6 h-6" />
          Review & Go Live
        </h2>
        <p className="text-muted-foreground">
          Final review before launching your platform
        </p>
      </div>

      {/* Preflight Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Readiness Checks
          </CardTitle>
          <CardDescription>
            Automated validation of your platform configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preflightResults.loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Running system checks...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {preflightResults.results.map((check: any) => (
                <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{check.name}</span>
                        {check.critical && (
                          <Badge variant="destructive" className="text-xs">
                            Critical
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{check.description}</p>
                    </div>
                  </div>
                  {getStatusBadge(check.status)}
                </div>
              ))}
            </div>
          )}

          {!preflightResults.loading && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="font-medium">
                Overall Status: {formData.preflightChecksCompleted ? 'Ready' : 'Needs Attention'}
              </span>
              <Button onClick={runPreflightChecks} variant="outline" size="sm">
                Re-run Checks
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Launch Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Launch Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-medium">Launch Mode</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <Button
                variant={formData.launchMode === 'staging' ? 'default' : 'outline'}
                onClick={() => handleInputChange('launchMode', 'staging')}
                className="justify-start"
              >
                <Eye className="w-4 h-4 mr-2" />
                Staging Mode
              </Button>
              <Button
                variant={formData.launchMode === 'production' ? 'default' : 'outline'}
                onClick={() => handleInputChange('launchMode', 'production')}
                className="justify-start"
              >
                <Rocket className="w-4 h-4 mr-2" />
                Production Mode
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {formData.launchMode === 'staging' 
                ? 'Launch in testing mode with limited access'
                : 'Launch in full production mode for all users'
              }
            </p>
          </div>

          <Separator />

          <div>
            <Label className="text-base font-medium">Notification Preferences</Label>
            <div className="space-y-3 mt-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emailNotifications"
                  checked={formData.notifications.emailNotifications}
                  onCheckedChange={(checked) => 
                    handleInputChange('notifications.emailNotifications', checked)
                  }
                />
                <Label htmlFor="emailNotifications">Email notifications</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="smsNotifications"
                  checked={formData.notifications.smsNotifications}
                  onCheckedChange={(checked) => 
                    handleInputChange('notifications.smsNotifications', checked)
                  }
                />
                <Label htmlFor="smsNotifications">SMS notifications</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="webhookNotifications"
                  checked={formData.notifications.webhookNotifications}
                  onCheckedChange={(checked) => 
                    handleInputChange('notifications.webhookNotifications', checked)
                  }
                />
                <Label htmlFor="webhookNotifications">Webhook notifications</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms and Agreements */}
      <Card>
        <CardHeader>
          <CardTitle>Terms and Agreements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="termsAccepted"
              checked={formData.termsAccepted}
              onCheckedChange={(checked) => handleInputChange('termsAccepted', checked)}
            />
            <div>
              <Label htmlFor="termsAccepted" className="text-sm">
                I accept the Terms of Service and End User License Agreement
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                By checking this box, you agree to our terms and conditions
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="dataPrivacyAccepted"
              checked={formData.dataPrivacyAccepted}
              onCheckedChange={(checked) => handleInputChange('dataPrivacyAccepted', checked)}
            />
            <div>
              <Label htmlFor="dataPrivacyAccepted" className="text-sm">
                I acknowledge the Data Processing and Privacy Policy
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                You understand how your data will be processed and stored
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Status */}
      {canGoLive() ? (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Ready to launch!</strong> All requirements have been met. 
            Your platform is ready to go live.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Action required:</strong> Please complete all requirements above before going live.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button
          onClick={handleSaveAndContinue}
          variant="outline"
          disabled={isLoading}
        >
          Save Progress
        </Button>

        <Button
          onClick={handleGoLive}
          disabled={isLoading || !canGoLive()}
          className="bg-green-600 hover:bg-green-700"
        >
          <Rocket className="w-4 h-4 mr-2" />
          {isLoading ? 'Launching...' : 'Go Live!'}
        </Button>
      </div>
    </div>
  );
};
