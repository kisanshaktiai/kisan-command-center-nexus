
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Phone, Mail, FileText, CheckCircle } from 'lucide-react';

interface CompanyProfileStepProps {
  tenantId: string;
  onComplete: (data: any) => void;
  data: any;
  onDataChange: (data: any) => void;
  helpText?: string;
  tenantInfo?: {
    name: string;
    owner_name?: string;
    owner_email?: string;
    owner_phone?: string;
    business_registration?: string;
    business_address?: string;
    subscription_plan: string;
    status: string;
  } | null;
}

export const CompanyProfileStep: React.FC<CompanyProfileStepProps> = ({
  tenantId,
  onComplete,
  data,
  onDataChange,
  helpText,
  tenantInfo
}) => {
  const [formData, setFormData] = useState({
    companyName: tenantInfo?.name || data.companyName || '',
    ownerName: tenantInfo?.owner_name || data.ownerName || '',
    email: tenantInfo?.owner_email || data.email || '',
    phone: tenantInfo?.owner_phone || data.phone || '',
    businessRegistration: tenantInfo?.business_registration || data.businessRegistration || '',
    address: tenantInfo?.business_address || data.address || '',
    description: data.description || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data when tenant info becomes available
  useEffect(() => {
    if (tenantInfo && Object.keys(formData).every(key => !formData[key as keyof typeof formData])) {
      const updatedData = {
        companyName: tenantInfo.name || '',
        ownerName: tenantInfo.owner_name || '',
        email: tenantInfo.owner_email || '',
        phone: tenantInfo.owner_phone || '',
        businessRegistration: tenantInfo.business_registration || '',
        address: tenantInfo.business_address || '',
        description: ''
      };
      setFormData(updatedData);
    }
  }, [tenantInfo]); // Removed formData from dependencies to prevent infinite loop

  // Notify parent of data changes
  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    if (!formData.ownerName.trim()) {
      newErrors.ownerName = 'Owner name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Business address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onComplete(formData);
    } catch (error) {
      console.error('Error submitting company profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const completionPercentage = Object.values(formData).filter(value => 
    typeof value === 'string' && value.trim() !== ''
  ).length / Object.keys(formData).length * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Building2 className="w-8 h-8 text-primary" />
          <h2 className="text-2xl font-bold">Company Profile</h2>
          <Badge variant="outline" className="ml-2">
            {Math.round(completionPercentage)}% Complete
          </Badge>
        </div>
        <p className="text-muted-foreground">
          {helpText || "Let's start by setting up your company information. This will be used throughout your platform."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Company Name *
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Enter company name"
                  className={errors.companyName ? 'border-red-500' : ''}
                />
                {errors.companyName && (
                  <p className="text-sm text-red-500">{errors.companyName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerName" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Owner Name *
                </Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  placeholder="Enter owner name"
                  className={errors.ownerName ? 'border-red-500' : ''}
                />
                {errors.ownerName && (
                  <p className="text-sm text-red-500">{errors.ownerName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessRegistration" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Business Registration
                </Label>
                <Input
                  id="businessRegistration"
                  value={formData.businessRegistration}
                  onChange={(e) => handleInputChange('businessRegistration', e.target.value)}
                  placeholder="Enter registration number (optional)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Business Address *
              </Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter complete business address"
                rows={3}
                className={errors.address ? 'border-red-500' : ''}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Company Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Tell us about your company (optional)"
                rows={4}
              />
            </div>

            <div className="flex justify-end pt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-32"
              >
                {isSubmitting ? (
                  'Saving...'
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Step
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {tenantInfo && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Pre-filled Information</span>
            </div>
            <p className="text-sm text-blue-800">
              We've pre-filled some information from your tenant profile. Please review and update as needed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
