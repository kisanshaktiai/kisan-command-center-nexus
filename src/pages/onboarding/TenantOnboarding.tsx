
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useTenantContext } from '@/hooks/useTenantContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const TenantOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { tenant, isLoading: tenantLoading } = useTenantContext();

  useEffect(() => {
    // Redirect if no tenant is selected
    if (!tenantLoading && !tenant) {
      navigate('/dashboard');
    }
  }, [tenant, tenantLoading, navigate]);

  if (tenantLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No tenant workspace found. Please contact your administrator or select a valid workspace.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full mt-4"
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <OnboardingProvider tenantId={tenant.id}>
        <div className="container mx-auto">
          <OnboardingWizard />
        </div>
      </OnboardingProvider>
    </div>
  );
};

export default TenantOnboarding;
