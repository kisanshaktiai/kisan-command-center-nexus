
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface BusinessVerificationStepProps {
  stepData: any;
  onComplete: (data: any) => void;
  onNext: () => void;
  isCompleted: boolean;
}

export const BusinessVerificationStep: React.FC<BusinessVerificationStepProps> = ({
  stepData,
  onComplete,
  onNext,
  isCompleted
}) => {
  const [formData, setFormData] = useState({
    gstNumber: stepData?.gst_number || '',
    panNumber: stepData?.pan_number || '',
    businessRegistration: stepData?.business_registration || '',
    gstCertificate: stepData?.gst_certificate || null,
    panCard: stepData?.pan_card || null,
    registrationCertificate: stepData?.registration_certificate || null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateGST = (gst: string) => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst);
  };

  const validatePAN = (pan: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  const handleComplete = async () => {
    if (!validateGST(formData.gstNumber)) {
      showError('Please enter a valid GST number');
      return;
    }

    if (!validatePAN(formData.panNumber)) {
      showError('Please enter a valid PAN number');
      return;
    }

    if (!formData.businessRegistration) {
      showError('Business registration number is required');
      return;
    }

    setIsLoading(true);
    try {
      const completionData = {
        gst_number: formData.gstNumber,
        pan_number: formData.panNumber,
        business_registration: formData.businessRegistration,
        gst_certificate: formData.gstCertificate,
        pan_card: formData.panCard,
        registration_certificate: formData.registrationCertificate,
        verification_status: 'pending',
        completed_at: new Date().toISOString(),
      };

      await onComplete(completionData);
      showSuccess('Business verification details saved successfully');
      onNext();
    } catch (error) {
      showError('Failed to save business verification details');
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
            Business Verification - Completed
          </CardTitle>
          <CardDescription>Your business documents have been verified</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>GST Number</Label>
                <div className="font-mono text-sm">{stepData?.gst_number}</div>
              </div>
              <div>
                <Label>PAN Number</Label>
                <div className="font-mono text-sm">{stepData?.pan_number}</div>
              </div>
            </div>
            <div>
              <Label>Business Registration</Label>
              <div className="font-mono text-sm">{stepData?.business_registration}</div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Verification Status: {stepData?.verification_status || 'Pending'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Business Verification
        </CardTitle>
        <CardDescription>
          Verify your business documents including GST, PAN, and registration certificates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gst">GST Number *</Label>
            <Input
              id="gst"
              placeholder="22AAAAA0000A1Z5"
              value={formData.gstNumber}
              onChange={(e) => handleInputChange('gstNumber', e.target.value.toUpperCase())}
              className={!validateGST(formData.gstNumber) && formData.gstNumber ? 'border-red-500' : ''}
            />
            {formData.gstNumber && !validateGST(formData.gstNumber) && (
              <p className="text-sm text-red-500">Invalid GST format</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pan">PAN Number *</Label>
            <Input
              id="pan"
              placeholder="AAAAA0000A"
              value={formData.panNumber}
              onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
              className={!validatePAN(formData.panNumber) && formData.panNumber ? 'border-red-500' : ''}
            />
            {formData.panNumber && !validatePAN(formData.panNumber) && (
              <p className="text-sm text-red-500">Invalid PAN format</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessReg">Business Registration Number *</Label>
          <Input
            id="businessReg"
            placeholder="Enter your business registration number"
            value={formData.businessRegistration}
            onChange={(e) => handleInputChange('businessRegistration', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>GST Certificate</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Upload GST Certificate</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>PAN Card</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Upload PAN Card</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Registration Certificate</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Upload Certificate</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Document Requirements</h4>
              <ul className="text-sm text-blue-800 mt-1 space-y-1">
                <li>• All documents must be clear and readable</li>
                <li>• GST and PAN numbers will be validated automatically</li>
                <li>• Business registration must match your company details</li>
                <li>• Verification typically takes 24-48 hours</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleComplete} 
            disabled={isLoading || !formData.gstNumber || !formData.panNumber || !formData.businessRegistration}
          >
            {isLoading ? 'Saving...' : 'Complete Verification'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
