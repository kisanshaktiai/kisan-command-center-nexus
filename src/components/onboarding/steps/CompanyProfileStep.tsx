
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Building2, MapPin, Calendar, Phone, Mail, FileText } from 'lucide-react';

interface CompanyProfileStepProps {
  onComplete: (data: any) => void;
  onSave: (data: any) => void;
  tenantId: string;
  stepData?: any;
  isLoading?: boolean;
  canProceed?: boolean;
}

export const CompanyProfileStep: React.FC<CompanyProfileStepProps> = ({
  onComplete,
  onSave,
  tenantId,
  stepData = {},
  isLoading = false,
  canProceed = true
}) => {
  const [formData, setFormData] = useState({
    companyName: stepData.companyName || '',
    ownerName: stepData.ownerName || '',
    ownerEmail: stepData.ownerEmail || '',
    ownerPhone: stepData.ownerPhone || '',
    businessRegistration: stepData.businessRegistration || '',
    businessAddress: stepData.businessAddress || {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India'
    },
    establishedDate: stepData.establishedDate || '',
    description: stepData.description || '',
    website: stepData.website || '',
    industry: stepData.industry || ''
  });

  const [errors, setErrors] = useState<any>({});

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.ownerName.trim()) {
      newErrors.ownerName = 'Owner name is required';
    }

    if (!formData.ownerEmail.trim()) {
      newErrors.ownerEmail = 'Owner email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
      newErrors.ownerEmail = 'Invalid email format';
    }

    if (!formData.businessAddress.street.trim()) {
      newErrors.street = 'Street address is required';
    }

    if (!formData.businessAddress.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.businessAddress.state.trim()) {
      newErrors.state = 'State is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
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

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Auto-save periodically
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(formData).some(key => formData[key] !== stepData[key])) {
        onSave(formData);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [formData, onSave, stepData]);

  const handleComplete = () => {
    if (validateForm()) {
      onComplete(formData);
    }
  };

  const handleSaveAndContinue = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Company Profile</h2>
        <p className="text-muted-foreground">
          Let's start by setting up your company information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Provide basic details about your company
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Enter company name"
                className={errors.companyName ? 'border-red-500' : ''}
              />
              {errors.companyName && (
                <p className="text-sm text-red-500 mt-1">{errors.companyName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              <Select
                value={formData.industry}
                onValueChange={(value) => handleInputChange('industry', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agriculture">Agriculture</SelectItem>
                  <SelectItem value="agri_tech">AgriTech</SelectItem>
                  <SelectItem value="fertilizer">Fertilizer</SelectItem>
                  <SelectItem value="seeds">Seeds</SelectItem>
                  <SelectItem value="machinery">Machinery</SelectItem>
                  <SelectItem value="trading">Trading</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="establishedDate">Established Date</Label>
              <Input
                id="establishedDate"
                type="date"
                value={formData.establishedDate}
                onChange={(e) => handleInputChange('establishedDate', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Company Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of your company"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Owner Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ownerName">Owner Name *</Label>
              <Input
                id="ownerName"
                value={formData.ownerName}
                onChange={(e) => handleInputChange('ownerName', e.target.value)}
                placeholder="Enter owner name"
                className={errors.ownerName ? 'border-red-500' : ''}
              />
              {errors.ownerName && (
                <p className="text-sm text-red-500 mt-1">{errors.ownerName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ownerEmail">Owner Email *</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                placeholder="owner@company.com"
                className={errors.ownerEmail ? 'border-red-500' : ''}
              />
              {errors.ownerEmail && (
                <p className="text-sm text-red-500 mt-1">{errors.ownerEmail}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ownerPhone">Owner Phone</Label>
              <Input
                id="ownerPhone"
                value={formData.ownerPhone}
                onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>

            <div>
              <Label htmlFor="businessRegistration">Business Registration</Label>
              <Input
                id="businessRegistration"
                value={formData.businessRegistration}
                onChange={(e) => handleInputChange('businessRegistration', e.target.value)}
                placeholder="GST/PAN/Registration Number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Business Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="street">Street Address *</Label>
            <Input
              id="street"
              value={formData.businessAddress.street}
              onChange={(e) => handleInputChange('businessAddress.street', e.target.value)}
              placeholder="Enter street address"
              className={errors.street ? 'border-red-500' : ''}
            />
            {errors.street && (
              <p className="text-sm text-red-500 mt-1">{errors.street}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.businessAddress.city}
                onChange={(e) => handleInputChange('businessAddress.city', e.target.value)}
                placeholder="City"
                className={errors.city ? 'border-red-500' : ''}
              />
              {errors.city && (
                <p className="text-sm text-red-500 mt-1">{errors.city}</p>
              )}
            </div>

            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.businessAddress.state}
                onChange={(e) => handleInputChange('businessAddress.state', e.target.value)}
                placeholder="State"
                className={errors.state ? 'border-red-500' : ''}
              />
              {errors.state && (
                <p className="text-sm text-red-500 mt-1">{errors.state}</p>
              )}
            </div>

            <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={formData.businessAddress.postalCode}
                onChange={(e) => handleInputChange('businessAddress.postalCode', e.target.value)}
                placeholder="PIN Code"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          onClick={handleSaveAndContinue}
          variant="outline"
          disabled={isLoading}
        >
          Save Progress
        </Button>

        <Button
          onClick={handleComplete}
          disabled={isLoading || !canProceed}
        >
          {isLoading ? 'Saving...' : 'Complete & Continue'}
        </Button>
      </div>
    </div>
  );
};
