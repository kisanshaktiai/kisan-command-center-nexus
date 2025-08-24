
import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Building2, 
  User, 
  Settings, 
  Palette,
  Save,
  X,
  CalendarIcon,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  Database,
  Zap,
  HardDrive
} from 'lucide-react';
import { Tenant, UpdateTenantDTO } from '@/types/tenant';
import { TenantType, TenantStatus, SubscriptionPlan } from '@/types/enums';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TenantEditModalEnhancedProps {
  tenant: Tenant;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: UpdateTenantDTO) => Promise<boolean>;
  isSubmitting: boolean;
}

export const TenantEditModalEnhanced: React.FC<TenantEditModalEnhancedProps> = ({
  tenant,
  isOpen,
  onClose,
  onSave,
  isSubmitting
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<UpdateTenantDTO>({
    name: tenant.name,
    status: tenant.status,
    subscription_plan: tenant.subscription_plan,
    owner_name: tenant.owner_name || '',
    owner_email: tenant.owner_email || '',
    owner_phone: tenant.owner_phone || '',
    business_registration: tenant.business_registration || '',
    business_address: tenant.business_address,
    established_date: tenant.established_date || '',
    subscription_start_date: tenant.subscription_start_date || '',
    subscription_end_date: tenant.subscription_end_date || '',
    trial_ends_at: tenant.trial_ends_at || '',
    max_farmers: tenant.max_farmers || 1000,
    max_dealers: tenant.max_dealers || 50,
    max_products: tenant.max_products || 100,
    max_storage_gb: tenant.max_storage_gb || 10,
    max_api_calls_per_day: tenant.max_api_calls_per_day || 10000,
    subdomain: tenant.subdomain || '',
    custom_domain: tenant.custom_domain || '',
    metadata: tenant.metadata || {},
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleInputChange = useCallback((field: keyof UpdateTenantDTO, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [validationErrors]);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      errors.name = 'Organization name is required';
    }
    
    if (formData.owner_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.owner_email)) {
      errors.owner_email = 'Please enter a valid email address';
    }

    if (formData.max_farmers && formData.max_farmers < 0) {
      errors.max_farmers = 'Maximum farmers must be positive';
    }

    if (formData.max_dealers && formData.max_dealers < 0) {
      errors.max_dealers = 'Maximum dealers must be positive';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;
    
    const success = await onSave(tenant.id, formData);
    if (success) {
      onClose();
    }
  }, [formData, onSave, tenant.id, onClose, validateForm]);

  const formatBusinessAddress = (address: any): string => {
    if (!address || typeof address !== 'object') return '';
    const parts = [address.street, address.city, address.state, address.postal_code, address.country].filter(Boolean);
    return parts.join(', ');
  };

  const renderDatePicker = (value: string | undefined, onChange: (date: string) => void, placeholder: string) => {
    const date = value ? new Date(value) : undefined;
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => selectedDate && onChange(selectedDate.toISOString())}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            Edit Tenant: {tenant.name}
            <Badge variant="secondary" className="ml-auto">
              {tenant.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Administrator
            </TabsTrigger>
            <TabsTrigger value="limits" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Limits & Features
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[600px] pr-4">
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Organization Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Organization Name *</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={validationErrors.name ? 'border-red-500' : ''}
                    />
                    {validationErrors.name && (
                      <p className="text-sm text-red-500">{validationErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status || ''} 
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TenantStatus.ACTIVE}>Active</SelectItem>
                        <SelectItem value={TenantStatus.TRIAL}>Trial</SelectItem>
                        <SelectItem value={TenantStatus.SUSPENDED}>Suspended</SelectItem>
                        <SelectItem value={TenantStatus.CANCELLED}>Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subscription_plan">Subscription Plan</Label>
                    <Select 
                      value={formData.subscription_plan || ''} 
                      onValueChange={(value) => handleInputChange('subscription_plan', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SubscriptionPlan.KISAN_BASIC}>Kisan Basic</SelectItem>
                        <SelectItem value={SubscriptionPlan.SHAKTI_GROWTH}>Shakti Growth</SelectItem>
                        <SelectItem value={SubscriptionPlan.AI_ENTERPRISE}>AI Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business_registration">Business Registration</Label>
                    <Input
                      id="business_registration"
                      value={formData.business_registration || ''}
                      onChange={(e) => handleInputChange('business_registration', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="business_address">Business Address</Label>
                    <Textarea
                      id="business_address"
                      value={formatBusinessAddress(formData.business_address)}
                      onChange={(e) => handleInputChange('business_address', { address: e.target.value })}
                      className="min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Important Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Established Date</Label>
                    {renderDatePicker(
                      formData.established_date,
                      (date) => handleInputChange('established_date', date),
                      'Select established date'
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Trial End Date</Label>
                    {renderDatePicker(
                      formData.trial_ends_at,
                      (date) => handleInputChange('trial_ends_at', date),
                      'Select trial end date'
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Subscription Start</Label>
                    {renderDatePicker(
                      formData.subscription_start_date,
                      (date) => handleInputChange('subscription_start_date', date),
                      'Select subscription start'
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Subscription End</Label>
                    {renderDatePicker(
                      formData.subscription_end_date,
                      (date) => handleInputChange('subscription_end_date', date),
                      'Select subscription end'
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Administrator Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="owner_name">Administrator Name</Label>
                    <Input
                      id="owner_name"
                      value={formData.owner_name || ''}
                      onChange={(e) => handleInputChange('owner_name', e.target.value)}
                      className={validationErrors.owner_name ? 'border-red-500' : ''}
                    />
                    {validationErrors.owner_name && (
                      <p className="text-sm text-red-500">{validationErrors.owner_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="owner_email">Administrator Email</Label>
                    <Input
                      id="owner_email"
                      type="email"
                      value={formData.owner_email || ''}
                      onChange={(e) => handleInputChange('owner_email', e.target.value)}
                      className={validationErrors.owner_email ? 'border-red-500' : ''}
                    />
                    {validationErrors.owner_email && (
                      <p className="text-sm text-red-500">{validationErrors.owner_email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="owner_phone">Administrator Phone</Label>
                    <Input
                      id="owner_phone"
                      type="tel"
                      value={formData.owner_phone || ''}
                      onChange={(e) => handleInputChange('owner_phone', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="limits" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Usage Limits & Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="max_farmers" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Maximum Farmers
                    </Label>
                    <Input
                      id="max_farmers"
                      type="number"
                      min="0"
                      value={formData.max_farmers || ''}
                      onChange={(e) => handleInputChange('max_farmers', parseInt(e.target.value) || 0)}
                      className={validationErrors.max_farmers ? 'border-red-500' : ''}
                    />
                    {validationErrors.max_farmers && (
                      <p className="text-sm text-red-500">{validationErrors.max_farmers}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_dealers" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Maximum Dealers
                    </Label>
                    <Input
                      id="max_dealers"
                      type="number"
                      min="0"
                      value={formData.max_dealers || ''}
                      onChange={(e) => handleInputChange('max_dealers', parseInt(e.target.value) || 0)}
                      className={validationErrors.max_dealers ? 'border-red-500' : ''}
                    />
                    {validationErrors.max_dealers && (
                      <p className="text-sm text-red-500">{validationErrors.max_dealers}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_products" className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Maximum Products
                    </Label>
                    <Input
                      id="max_products"
                      type="number"
                      min="0"
                      value={formData.max_products || ''}
                      onChange={(e) => handleInputChange('max_products', parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_storage_gb" className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      Storage Limit (GB)
                    </Label>
                    <Input
                      id="max_storage_gb"
                      type="number"
                      min="0"
                      value={formData.max_storage_gb || ''}
                      onChange={(e) => handleInputChange('max_storage_gb', parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="max_api_calls_per_day" className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      API Calls Per Day
                    </Label>
                    <Input
                      id="max_api_calls_per_day"
                      type="number"
                      min="0"
                      value={formData.max_api_calls_per_day || ''}
                      onChange={(e) => handleInputChange('max_api_calls_per_day', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Domain Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="subdomain">Subdomain</Label>
                    <Input
                      id="subdomain"
                      value={formData.subdomain || ''}
                      onChange={(e) => handleInputChange('subdomain', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom_domain">Custom Domain</Label>
                    <Input
                      id="custom_domain"
                      value={formData.custom_domain || ''}
                      onChange={(e) => handleInputChange('custom_domain', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>

          <Separator className="my-6" />
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
