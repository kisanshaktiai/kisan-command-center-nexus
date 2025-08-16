
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface CompanyProfileStepProps {
  tenantId: string;
  onComplete: (data: any) => void;
  data: any;
  onDataChange: (data: any) => void;
}

export const CompanyProfileStep: React.FC<CompanyProfileStepProps> = ({
  tenantId,
  onComplete,
  data,
  onDataChange
}) => {
  const [formData, setFormData] = useState({
    companyName: '',
    businessType: '',
    gstNumber: '',
    panNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    contactPerson: {
      name: '',
      email: '',
      phone: ''
    },
    businessDescription: '',
    establishedYear: '',
    ...data
  });

  const [validationStatus, setValidationStatus] = useState({
    gst: { status: 'pending', message: '' },
    pan: { status: 'pending', message: '' }
  });

  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    loadTenantData();
  }, [tenantId]);

  const loadTenantData = async () => {
    try {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      if (tenant) {
        setFormData(prev => ({
          ...prev,
          companyName: tenant.name || '',
          businessDescription: tenant.metadata?.description || '',
          contactPerson: {
            name: tenant.owner_name || '',
            email: tenant.owner_email || '',
            phone: tenant.owner_phone || ''
          }
        }));
      }
    } catch (error) {
      console.error('Error loading tenant data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateGST = async (gstNumber: string) => {
    if (!gstNumber || gstNumber.length !== 15) {
      setValidationStatus(prev => ({
        ...prev,
        gst: { status: 'invalid', message: 'GST number must be 15 characters' }
      }));
      return;
    }

    setIsValidating(true);
    try {
      // Simulate GST validation API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Basic GST format validation
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      
      if (gstRegex.test(gstNumber)) {
        setValidationStatus(prev => ({
          ...prev,
          gst: { status: 'valid', message: 'GST number verified successfully' }
        }));
      } else {
        setValidationStatus(prev => ({
          ...prev,
          gst: { status: 'invalid', message: 'Invalid GST number format' }
        }));
      }
    } catch (error) {
      setValidationStatus(prev => ({
        ...prev,
        gst: { status: 'error', message: 'Failed to validate GST number' }
      }));
    } finally {
      setIsValidating(false);
    }
  };

  const validatePAN = async (panNumber: string) => {
    if (!panNumber || panNumber.length !== 10) {
      setValidationStatus(prev => ({
        ...prev,
        pan: { status: 'invalid', message: 'PAN number must be 10 characters' }
      }));
      return;
    }

    setIsValidating(true);
    try {
      // Simulate PAN validation API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Basic PAN format validation
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      
      if (panRegex.test(panNumber)) {
        setValidationStatus(prev => ({
          ...prev,
          pan: { status: 'valid', message: 'PAN number verified successfully' }
        }));
      } else {
        setValidationStatus(prev => ({
          ...prev,
          pan: { status: 'invalid', message: 'Invalid PAN number format' }
        }));
      }
    } catch (error) {
      setValidationStatus(prev => ({
        ...prev,
        pan: { status: 'error', message: 'Failed to validate PAN number' }
      }));
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData };
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      newData[parent] = { ...newData[parent], [child]: value };
    } else {
      newData[field] = value;
    }
    
    setFormData(newData);
    onDataChange(newData);
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      const requiredFields = [
        'companyName',
        'businessType',
        'gstNumber',
        'panNumber',
        'contactPerson.name',
        'contactPerson.email'
      ];

      const missingFields = requiredFields.filter(field => {
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          return !formData[parent]?.[child];
        }
        return !formData[field];
      });

      if (missingFields.length > 0) {
        showError('Please fill in all required fields');
        return;
      }

      if (validationStatus.gst.status !== 'valid' || validationStatus.pan.status !== 'valid') {
        showError('Please ensure GST and PAN numbers are validated');
        return;
      }

      // Update tenant record with business profile data
      const { error } = await supabase
        .from('tenants')
        .update({
          business_registration: formData.gstNumber,
          business_address: formData.address,
          owner_name: formData.contactPerson.name,
          owner_email: formData.contactPerson.email,
          owner_phone: formData.contactPerson.phone,
          metadata: {
            ...formData,
            profileCompleted: true,
            completedAt: new Date().toISOString()
          }
        })
        .eq('id', tenantId);

      if (error) throw error;

      showSuccess('Company profile completed successfully');
      onComplete(formData);
    } catch (error) {
      console.error('Error saving company profile:', error);
      showError('Failed to save company profile');
    }
  };

  const isFormValid = () => {
    return formData.companyName &&
           formData.businessType &&
           formData.gstNumber &&
           formData.panNumber &&
           formData.contactPerson.name &&
           formData.contactPerson.email &&
           validationStatus.gst.status === 'valid' &&
           validationStatus.pan.status === 'valid';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Company Profile Setup</h3>
        <p className="text-muted-foreground">
          Complete your business profile with accurate information for verification
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Company details and business type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div>
              <Label htmlFor="businessType">Business Type *</Label>
              <Select
                value={formData.businessType}
                onValueChange={(value) => handleInputChange('businessType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private_limited">Private Limited</SelectItem>
                  <SelectItem value="public_limited">Public Limited</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="proprietorship">Proprietorship</SelectItem>
                  <SelectItem value="llp">Limited Liability Partnership</SelectItem>
                  <SelectItem value="trust">Trust</SelectItem>
                  <SelectItem value="society">Society</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="businessDescription">Business Description</Label>
            <Textarea
              id="businessDescription"
              value={formData.businessDescription}
              onChange={(e) => handleInputChange('businessDescription', e.target.value)}
              placeholder="Describe your business activities"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="establishedYear">Established Year</Label>
            <Input
              id="establishedYear"
              type="number"
              min="1800"
              max={new Date().getFullYear()}
              value={formData.establishedYear}
              onChange={(e) => handleInputChange('establishedYear', e.target.value)}
              placeholder="Enter year established"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax Information</CardTitle>
          <CardDescription>GST and PAN details for verification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gstNumber">GST Number *</Label>
              <div className="flex gap-2">
                <Input
                  id="gstNumber"
                  value={formData.gstNumber}
                  onChange={(e) => {
                    handleInputChange('gstNumber', e.target.value.toUpperCase());
                    if (e.target.value.length === 15) {
                      validateGST(e.target.value.toUpperCase());
                    }
                  }}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
                {isValidating && <Loader2 className="w-4 h-4 animate-spin self-center" />}
              </div>
              {validationStatus.gst.message && (
                <div className="flex items-center gap-2 mt-1">
                  {validationStatus.gst.status === 'valid' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {validationStatus.gst.status === 'invalid' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {validationStatus.gst.status === 'error' && <AlertCircle className="w-4 h-4 text-orange-500" />}
                  <span className={`text-sm ${
                    validationStatus.gst.status === 'valid' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {validationStatus.gst.message}
                  </span>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="panNumber">PAN Number *</Label>
              <Input
                id="panNumber"
                value={formData.panNumber}
                onChange={(e) => {
                  handleInputChange('panNumber', e.target.value.toUpperCase());
                  if (e.target.value.length === 10) {
                    validatePAN(e.target.value.toUpperCase());
                  }
                }}
                placeholder="AAAPL1234C"
                maxLength={10}
              />
              {validationStatus.pan.message && (
                <div className="flex items-center gap-2 mt-1">
                  {validationStatus.pan.status === 'valid' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {validationStatus.pan.status === 'invalid' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {validationStatus.pan.status === 'error' && <AlertCircle className="w-4 h-4 text-orange-500" />}
                  <span className={`text-sm ${
                    validationStatus.pan.status === 'valid' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {validationStatus.pan.message}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Address</CardTitle>
          <CardDescription>Registered office address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={formData.address.street}
              onChange={(e) => handleInputChange('address.street', e.target.value)}
              placeholder="Enter street address"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.address.city}
                onChange={(e) => handleInputChange('address.city', e.target.value)}
                placeholder="Enter city"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.address.state}
                onChange={(e) => handleInputChange('address.state', e.target.value)}
                placeholder="Enter state"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pincode">PIN Code</Label>
              <Input
                id="pincode"
                value={formData.address.pincode}
                onChange={(e) => handleInputChange('address.pincode', e.target.value)}
                placeholder="Enter PIN code"
                maxLength={6}
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.address.country}
                onChange={(e) => handleInputChange('address.country', e.target.value)}
                placeholder="Enter country"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Person</CardTitle>
          <CardDescription>Primary contact for this account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactName">Name *</Label>
              <Input
                id="contactName"
                value={formData.contactPerson.name}
                onChange={(e) => handleInputChange('contactPerson.name', e.target.value)}
                placeholder="Enter contact person name"
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactPerson.email}
                onChange={(e) => handleInputChange('contactPerson.email', e.target.value)}
                placeholder="Enter email address"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="contactPhone">Phone</Label>
            <Input
              id="contactPhone"
              value={formData.contactPerson.phone}
              onChange={(e) => handleInputChange('contactPerson.phone', e.target.value)}
              placeholder="Enter phone number"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid() || isValidating}
          className="min-w-32"
        >
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            'Complete Profile'
          )}
        </Button>
      </div>
    </div>
  );
};
