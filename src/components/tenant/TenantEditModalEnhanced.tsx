
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  User, 
  CreditCard, 
  Globe, 
  Shield, 
  Settings,
  Save,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  Database,
  Zap
} from 'lucide-react';
import { Tenant, UpdateTenantDTO, TenantStatus, SubscriptionPlan } from '@/types/tenant';
import { tenantStatusOptions, subscriptionPlanOptions } from '@/types/tenant';

interface TenantEditModalEnhancedProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: UpdateTenantDTO) => Promise<boolean>;
  isSubmitting?: boolean;
}

export const TenantEditModalEnhanced: React.FC<TenantEditModalEnhancedProps> = ({
  tenant,
  isOpen,
  onClose,
  onSave,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<UpdateTenantDTO>({
    name: '',
    status: 'active' as TenantStatus,
    subscription_plan: 'Kisan_Basic' as SubscriptionPlan,
  });

  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        status: tenant.status,
        subscription_plan: tenant.subscription_plan,
        owner_phone: tenant.owner_phone || '',
        business_registration: tenant.business_registration || '',
        established_date: tenant.established_date || '',
        max_farmers: tenant.max_farmers || 1000,
        max_dealers: tenant.max_dealers || 50,
        max_products: tenant.max_products || 100,
        max_storage_gb: tenant.max_storage_gb || 10,
        max_api_calls_per_day: tenant.max_api_calls_per_day || 10000,
        subdomain: tenant.subdomain || '',
        custom_domain: tenant.custom_domain || '',
        // Additional fields from tenant table
        owner_name: tenant.owner_name || '',
        owner_email: tenant.owner_email || '',
        business_address: tenant.business_address || {},
        subscription_start_date: tenant.subscription_start_date || '',
        subscription_end_date: tenant.subscription_end_date || '',
        trial_ends_at: tenant.trial_ends_at || '',
        metadata: tenant.metadata || {},
      });
    }
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    const success = await onSave(tenant.id, formData);
    if (success) {
      onClose();
    }
  };

  const handleInputChange = (field: keyof UpdateTenantDTO, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 bg-gradient-to-br from-slate-50 to-white border-0 shadow-2xl">
        {/* Enhanced Header */}
        <DialogHeader className="px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white">
                Edit Tenant: {tenant.name}
              </DialogTitle>
              <p className="text-blue-100 mt-1">Update tenant information and configuration</p>
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <ScrollArea className="flex-1 px-8">
            <div className="py-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-6 bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger value="basic" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Building2 className="h-4 w-4" />
                    Basic
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <User className="h-4 w-4" />
                    Contact
                  </TabsTrigger>
                  <TabsTrigger value="subscription" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <CreditCard className="h-4 w-4" />
                    Subscription
                  </TabsTrigger>
                  <TabsTrigger value="limits" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Settings className="h-4 w-4" />
                    Limits
                  </TabsTrigger>
                  <TabsTrigger value="domains" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Globe className="h-4 w-4" />
                    Domains
                  </TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        Organization Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm font-medium text-gray-700">Organization Name *</Label>
                          <Input
                            id="name"
                            value={formData.name || ''}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="Enter organization name"
                            className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="status" className="text-sm font-medium text-gray-700">Status</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) => handleInputChange('status', value)}
                          >
                            <SelectTrigger className="h-11 bg-white border-gray-200 focus:border-blue-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {tenantStatusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="business_registration" className="text-sm font-medium text-gray-700">Business Registration</Label>
                        <Input
                          id="business_registration"
                          value={formData.business_registration || ''}
                          onChange={(e) => handleInputChange('business_registration', e.target.value)}
                          placeholder="Business registration number"
                          className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="established_date" className="text-sm font-medium text-gray-700">Established Date</Label>
                        <Input
                          id="established_date"
                          type="date"
                          value={formData.established_date || ''}
                          onChange={(e) => handleInputChange('established_date', e.target.value)}
                          className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Contact Information Tab */}
                <TabsContent value="contact" className="space-y-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-green-600" />
                        Contact Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="owner_name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Owner Name
                          </Label>
                          <Input
                            id="owner_name"
                            value={formData.owner_name || ''}
                            onChange={(e) => handleInputChange('owner_name', e.target.value)}
                            placeholder="Enter owner full name"
                            className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="owner_email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Owner Email
                          </Label>
                          <Input
                            id="owner_email"
                            type="email"
                            value={formData.owner_email || ''}
                            onChange={(e) => handleInputChange('owner_email', e.target.value)}
                            placeholder="Enter owner email"
                            className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="owner_phone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Owner Phone
                        </Label>
                        <Input
                          id="owner_phone"
                          value={formData.owner_phone || ''}
                          onChange={(e) => handleInputChange('owner_phone', e.target.value)}
                          placeholder="Enter phone number with country code"
                          className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Business Address
                        </Label>
                        <Textarea
                          value={JSON.stringify(formData.business_address || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              handleInputChange('business_address', parsed);
                            } catch {
                              // Invalid JSON, don't update
                            }
                          }}
                          placeholder="Enter business address as JSON"
                          className="min-h-[100px] bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Subscription Tab */}
                <TabsContent value="subscription" className="space-y-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-purple-600" />
                        Subscription Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="subscription_plan" className="text-sm font-medium text-gray-700">Subscription Plan</Label>
                        <Select
                          value={formData.subscription_plan}
                          onValueChange={(value) => handleInputChange('subscription_plan', value)}
                        >
                          <SelectTrigger className="h-11 bg-white border-gray-200 focus:border-blue-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {subscriptionPlanOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="subscription_start_date" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Subscription Start Date
                          </Label>
                          <Input
                            id="subscription_start_date"
                            type="date"
                            value={formData.subscription_start_date || ''}
                            onChange={(e) => handleInputChange('subscription_start_date', e.target.value)}
                            className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="subscription_end_date" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Subscription End Date
                          </Label>
                          <Input
                            id="subscription_end_date"
                            type="date"
                            value={formData.subscription_end_date || ''}
                            onChange={(e) => handleInputChange('subscription_end_date', e.target.value)}
                            className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="trial_ends_at" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Trial End Date
                        </Label>
                        <Input
                          id="trial_ends_at"
                          type="date"
                          value={formData.trial_ends_at || ''}
                          onChange={(e) => handleInputChange('trial_ends_at', e.target.value)}
                          className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Limits Tab */}
                <TabsContent value="limits" className="space-y-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-orange-600" />
                        Subscription Limits
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="max_farmers" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Max Farmers
                          </Label>
                          <Input
                            id="max_farmers"
                            type="number"
                            value={formData.max_farmers || ''}
                            onChange={(e) => handleInputChange('max_farmers', parseInt(e.target.value) || 0)}
                            placeholder="1000"
                            className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="max_dealers" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Max Dealers
                          </Label>
                          <Input
                            id="max_dealers"
                            type="number"
                            value={formData.max_dealers || ''}
                            onChange={(e) => handleInputChange('max_dealers', parseInt(e.target.value) || 0)}
                            placeholder="50"
                            className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="max_products" className="text-sm font-medium text-gray-700">Max Products</Label>
                          <Input
                            id="max_products"
                            type="number"
                            value={formData.max_products || ''}
                            onChange={(e) => handleInputChange('max_products', parseInt(e.target.value) || 0)}
                            placeholder="100"
                            className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="max_storage_gb" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Max Storage (GB)
                          </Label>
                          <Input
                            id="max_storage_gb"
                            type="number"
                            value={formData.max_storage_gb || ''}
                            onChange={(e) => handleInputChange('max_storage_gb', parseInt(e.target.value) || 0)}
                            placeholder="10"
                            className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="max_api_calls_per_day" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Max API Calls/Day
                        </Label>
                        <Input
                          id="max_api_calls_per_day"
                          type="number"
                          value={formData.max_api_calls_per_day || ''}
                          onChange={(e) => handleInputChange('max_api_calls_per_day', parseInt(e.target.value) || 0)}
                          placeholder="10000"
                          className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Domains Tab */}
                <TabsContent value="domains" className="space-y-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-blue-600" />
                        Domain Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="subdomain" className="text-sm font-medium text-gray-700">Subdomain</Label>
                          <Input
                            id="subdomain"
                            value={formData.subdomain || ''}
                            onChange={(e) => handleInputChange('subdomain', e.target.value)}
                            placeholder="your-subdomain"
                            className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500">Will be available at: your-subdomain.yourplatform.com</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="custom_domain" className="text-sm font-medium text-gray-700">Custom Domain</Label>
                          <Input
                            id="custom_domain"
                            value={formData.custom_domain || ''}
                            onChange={(e) => handleInputChange('custom_domain', e.target.value)}
                            placeholder="www.yourcompany.com"
                            className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500">Custom domain must be verified before use</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          {/* Enhanced Action Footer */}
          <div className="flex justify-between items-center px-8 py-6 bg-gradient-to-r from-slate-50 to-white border-t border-slate-200">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Shield className="h-4 w-4" />
              <span>All changes are logged for security</span>
            </div>
            
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
                className="hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
