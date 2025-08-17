import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Phone, Mail, FileText, CheckCircle, Loader2 } from 'lucide-react';
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
    registrationNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    ...data
  });

  const [isValidating, setIsValidating] = useState(false);
  const [isLoadingTenantData, setIsLoadingTenantData] = useState(true);
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'pending'>>({});
  const { showSuccess, showError } = useNotifications();

  const businessTypes = [
    'Agriculture Equipment Manufacturer',
    'Seed Company',
    'Fertilizer Company',
    'Pesticide Company',
    'Farm Equipment Dealer',
    'Agricultural Cooperative',
    'Food Processing Company',
    'Agritech Startup',
    'Government Organization',
    'NGO',
    'Other'
  ];

  // Load tenant data on mount to preload form
  useEffect(() => {
    const loadTenantData = async () => {
      if (!tenantId) {
        setIsLoadingTenantData(false);
        return;
      }

      try {
        setIsLoadingTenantData(true);
        
        const { data: tenantData, error } = await supabase
          .from('tenants')
          .select(`
            id,
            name,
            owner_name,
            owner_email,
            owner_phone,
            business_registration,
            business_address,
            metadata
          `)
          .eq('id', tenantId)
          .single();

        if (error) {
          console.error('Error loading tenant data:', error);
          showError('Failed to load tenant information');
          return;
        }

        if (tenantData) {
          // Parse business address if it's a JSON string
          let businessAddress: any = {};
          if (tenantData.business_address) {
            if (typeof tenantData.business_address === 'string') {
              try {
                businessAddress = JSON.parse(tenantData.business_address);
              } catch (e) {
                console.warn('Could not parse business_address:', e);
                businessAddress = { address: tenantData.business_address };
              }
            } else if (typeof tenantData.business_address === 'object') {
              businessAddress = tenantData.business_address;
            }
          }

          // Parse metadata for additional company profile data
          let metadata: any = {};
          if (tenantData.metadata) {
            if (typeof tenantData.metadata === 'string') {
              try {
                metadata = JSON.parse(tenantData.metadata);
              } catch (e) {
                console.warn('Could not parse metadata:', e);
                metadata = {};
              }
            } else if (typeof tenantData.metadata === 'object') {
              metadata = tenantData.metadata;
            }
          }

          // Extract company profile data from metadata if available
          const companyProfileData = metadata?.companyProfile || {};

          // Preload form with tenant data, prioritizing existing form data
          const preloadedData = {
            companyName: data.companyName || companyProfileData.companyName || tenantData.name || '',
            businessType: data.businessType || companyProfileData.businessType || '',
            gstNumber: data.gstNumber || companyProfileData.gstNumber || '',
            panNumber: data.panNumber || companyProfileData.panNumber || '',
            registrationNumber: data.registrationNumber || companyProfileData.registrationNumber || tenantData.business_registration || '',
            address: data.address || companyProfileData.address || businessAddress?.street || businessAddress?.address || '',
            city: data.city || companyProfileData.city || businessAddress?.city || '',
            state: data.state || companyProfileData.state || businessAddress?.state || '',
            pincode: data.pincode || companyProfileData.pincode || businessAddress?.postal_code || businessAddress?.pincode || '',
            phone: data.phone || companyProfileData.phone || tenantData.owner_phone || '',
            email: data.email || companyProfileData.email || tenantData.owner_email || '',
            website: data.website || companyProfileData.website || '',
            description: data.description || companyProfileData.description || '',
            ...data // Keep any additional data passed in
          };

          setFormData(preloadedData);
          onDataChange(preloadedData);
        }
      } catch (error) {
        console.error('Error loading tenant data:', error);
        showError('Failed to load tenant information');
      } finally {
        setIsLoadingTenantData(false);
      }
    };

    loadTenantData();
  }, [tenantId, showError]); // Don't include data and onDataChange to avoid infinite loops

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onDataChange(newData);

    // Trigger validation for specific fields
    if (field === 'gstNumber' && value.length === 15) {
      validateGST(value);
    }
  };

  const validateGST = async (gstNumber: string) => {
    setIsValidating(true);
    setValidationStatus(prev => ({ ...prev, gst: 'pending' }));

    try {
      // Simulate GST validation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Basic GST format validation
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      
      if (gstRegex.test(gstNumber)) {
        setValidationStatus(prev => ({ ...prev, gst: 'valid' }));
      } else {
        setValidationStatus(prev => ({ ...prev, gst: 'invalid' }));
      }
    } catch (error) {
      setValidationStatus(prev => ({ ...prev, gst: 'invalid' }));
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // Get existing tenant data first
      const { data: existingTenant, error: fetchError } = await supabase
        .from('tenants')
        .select('metadata')
        .eq('id', tenantId)
        .single();

      if (fetchError) throw fetchError;

      let existingMetadata = {};
      try {
        existingMetadata = typeof existingTenant.metadata === 'string' 
          ? JSON.parse(existingTenant.metadata) 
          : existingTenant.metadata || {};
      } catch (e) {
        console.warn('Could not parse existing metadata:', e);
        existingMetadata = {};
      }

      // Update tenant with company profile data
      const { error } = await supabase
        .from('tenants')
        .update({
          business_registration: formData.registrationNumber,
          owner_name: formData.companyName,
          owner_email: formData.email,
          owner_phone: formData.phone,
          business_address: {
            street: formData.address,
            city: formData.city,
            state: formData.state,
            postal_code: formData.pincode,
            country: 'India'
          },
          metadata: {
            ...existingMetadata,
            companyProfile: formData,
            profileCompleted: true,
            completedAt: new Date().toISOString()
          }
        })
        .eq('id', tenantId);

      if (error) throw error;

      showSuccess('Company profile saved successfully');
      onComplete(formData);
    } catch (error) {
      console.error('Error saving company profile:', error);
      showError('Failed to save company profile');
    }
  };

  const getValidationBadge = (field: string) => {
    const status = validationStatus[field];
    if (!status) return null;

    const variants = {
      valid: { variant: 'default' as const, text: 'Verified', icon: CheckCircle },
      invalid: { variant: 'destructive' as const, text: 'Invalid', icon: null },
      pending: { variant: 'secondary' as const, text: 'Validating...', icon: null }
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="ml-2">
        {Icon && <Icon className="w-3 h-3 mr-1" />}
        {config.text}
      </Badge>
    );
  };

  if (isLoadingTenantData) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading tenant information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Company Profile Setup</h3>
        <p className="text-muted-foreground">
          Complete your business details for verification and setup
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  {businessTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Business Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of your business"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.yourcompany.com"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Legal & Registration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="gstNumber">GST Number</Label>
              <div className="flex items-center">
                <Input
                  id="gstNumber"
                  value={formData.gstNumber}
                  onChange={(e) => handleInputChange('gstNumber', e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
                {getValidationBadge('gst')}
              </div>
            </div>

            <div>
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                value={formData.panNumber}
                onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
                placeholder="AAAPL1234C"
                maxLength={10}
              />
            </div>

            <div>
              <Label htmlFor="registrationNumber">Registration Number *</Label>
              <Input
                id="registrationNumber"
                value={formData.registrationNumber}
                onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                placeholder="Company registration number"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Address Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Complete business address"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="State"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                value={formData.pincode}
                onChange={(e) => handleInputChange('pincode', e.target.value)}
                placeholder="000000"
                maxLength={6}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>

            <div>
              <Label htmlFor="email">Business Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@yourcompany.com"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit}
          disabled={!formData.companyName || !formData.businessType || !formData.registrationNumber}
        >
          Complete Company Profile
        </Button>
      </div>
    </div>
  );
};
