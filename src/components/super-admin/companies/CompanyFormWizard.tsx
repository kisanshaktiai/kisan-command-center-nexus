import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Building,
  Contact,
  Briefcase,
  MapPin,
  Settings,
  ChevronLeft,
  ChevronRight,
  Save,
  X
} from 'lucide-react';

interface CompanyFormWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  isEditing?: boolean;
}

const steps = [
  { id: 'basic', title: 'Basic Information', icon: Building },
  { id: 'contact', title: 'Contact Details', icon: Contact },
  { id: 'business', title: 'Business Info', icon: Briefcase },
  { id: 'address', title: 'Address', icon: MapPin },
  { id: 'settings', title: 'AI Settings', icon: Settings },
];

export const CompanyFormWizard: React.FC<CompanyFormWizardProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'manufacturer',
    description: '',
    email: '',
    phone: '',
    website: '',
    gst_number: '',
    pan_number: '',
    established_date: '',
    annual_revenue: '',
    certifications: [] as string[],
    address: {
      street: '',
      city: '',
      state: '',
      country: 'India',
      postal_code: '',
    },
    status: 'pending' as 'active' | 'inactive' | 'pending' | 'verified',
    is_potential_tenant: true,
    is_ai_recommendable: true,
    ...initialData,
  });

  const [certificationsInput, setCertificationsInput] = useState('');

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: !isEditing ? generateSlug(name) : prev.slug,
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.slug) {
      toast.error('Please provide company name and slug');
      setCurrentStep(0);
      return;
    }
    onSubmit(formData);
  };

  const addCertification = () => {
    if (certificationsInput.trim()) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, certificationsInput.trim()]
      }));
      setCertificationsInput('');
    }
  };

  const removeCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const progressValue = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Company' : 'Add New Company'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progressValue} className="h-2" />
          <div className="flex justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                    index === currentStep
                      ? 'bg-primary/10 text-primary'
                      : index < currentStep
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs hidden sm:inline">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="mt-6 min-h-[300px]">
          {/* Step 1: Basic Information */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="company-slug"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Company Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturer">Manufacturer</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="retailer">Retailer</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="service_provider">Service Provider</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the company"
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="company@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Business Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gst_number">GST Number</Label>
                  <Input
                    id="gst_number"
                    value={formData.gst_number}
                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                    placeholder="GST number"
                  />
                </div>
                <div>
                  <Label htmlFor="pan_number">PAN Number</Label>
                  <Input
                    id="pan_number"
                    value={formData.pan_number}
                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                    placeholder="PAN number"
                  />
                </div>
                <div>
                  <Label htmlFor="established_date">Established Date</Label>
                  <Input
                    id="established_date"
                    type="date"
                    value={formData.established_date}
                    onChange={(e) => setFormData({ ...formData, established_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="annual_revenue">Annual Revenue (₹)</Label>
                  <Input
                    id="annual_revenue"
                    type="number"
                    value={formData.annual_revenue}
                    onChange={(e) => setFormData({ ...formData, annual_revenue: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Certifications</Label>
                  <div className="flex gap-2">
                    <Input
                      value={certificationsInput}
                      onChange={(e) => setCertificationsInput(e.target.value)}
                      placeholder="Add certification"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                    />
                    <Button type="button" onClick={addCertification}>Add</Button>
                  </div>
                  {formData.certifications.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.certifications.map((cert, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                        >
                          {cert}
                          <button
                            onClick={() => removeCertification(index)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Address */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={formData.address.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value }
                    })}
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value }
                    })}
                    placeholder="Mumbai"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value }
                    })}
                    placeholder="Maharashtra"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.address.country}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, country: e.target.value }
                    })}
                    placeholder="India"
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.address.postal_code}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, postal_code: e.target.value }
                    })}
                    placeholder="400001"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: AI Settings */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                  <div>
                    <Label htmlFor="potential_tenant">Potential Tenant</Label>
                    <p className="text-sm text-muted-foreground">
                      Mark as a potential tenant for conversion
                    </p>
                  </div>
                  <Switch
                    id="potential_tenant"
                    checked={formData.is_potential_tenant}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_potential_tenant: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                  <div>
                    <Label htmlFor="ai_recommendable">AI Recommendable</Label>
                    <p className="text-sm text-muted-foreground">
                      Include in AI-powered recommendations
                    </p>
                  </div>
                  <Switch
                    id="ai_recommendable"
                    checked={formData.is_ai_recommendable}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_ai_recommendable: checked })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevious}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            {currentStep < steps.length - 1 ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit}>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Update' : 'Create'} Company
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};