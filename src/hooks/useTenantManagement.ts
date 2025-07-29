import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { TenantService } from '@/services/tenantService';
import { Tenant, TenantFormData } from '@/types/tenant';
import { TenantViewPreferences, TenantMetrics } from '@/types/tenantView';
import { supabase } from '@/integrations/supabase/client';

export const useTenantManagement = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantMetrics, setTenantMetrics] = useState<Record<string, TenantMetrics>>({});
  const { toast } = useToast();

  // View preferences state
  const [viewPreferences, setViewPreferences] = useState<TenantViewPreferences>({
    mode: 'small-cards',
    density: 'comfortable',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Form state with default values
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    slug: '',
    type: 'agri_company',
    status: 'trial',
    subscription_plan: 'Kisan_Basic',
    max_farmers: 1000,
    max_dealers: 50,
    max_products: 100,
    max_storage_gb: 10,
    max_api_calls_per_day: 10000,
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    // Load view preferences from localStorage
    const savedPreferences = localStorage.getItem('tenant-view-preferences');
    if (savedPreferences) {
      setViewPreferences(JSON.parse(savedPreferences));
    }
  }, []);

  useEffect(() => {
    // Save view preferences to localStorage
    localStorage.setItem('tenant-view-preferences', JSON.stringify(viewPreferences));
  }, [viewPreferences]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching tenants...');
      const data = await TenantService.fetchTenants();
      console.log('Tenants fetched successfully:', data);
      setTenants(data);
      
      if (data.length === 0) {
        console.log('No tenants found in the database');
      }

      // Fetch metrics for tenants if in large cards or analytics view
      if (viewPreferences.mode === 'large-cards' || viewPreferences.mode === 'analytics') {
        fetchTenantsMetrics(data);
      }
    } catch (error: any) {
      console.error('Error fetching tenants:', error);
      const errorMessage = error.message || 'Failed to fetch tenants';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantsMetrics = async (tenantList: Tenant[]) => {
    const metricsPromises = tenantList.map(async (tenant) => {
      try {
        const response = await supabase.functions.invoke('tenant-limits-quotas', {
          body: { tenantId: tenant.id }
        });

        if (response.data) {
          return {
            tenantId: tenant.id,
            metrics: {
              usageMetrics: {
                farmers: { 
                  current: response.data.usage.farmers, 
                  limit: response.data.limits.farmers, 
                  percentage: (response.data.usage.farmers / response.data.limits.farmers) * 100 
                },
                dealers: { 
                  current: response.data.usage.dealers, 
                  limit: response.data.limits.dealers, 
                  percentage: (response.data.usage.dealers / response.data.limits.dealers) * 100 
                },
                products: { 
                  current: response.data.usage.products, 
                  limit: response.data.limits.products, 
                  percentage: (response.data.usage.products / response.data.limits.products) * 100 
                },
                storage: { 
                  current: response.data.usage.storage, 
                  limit: response.data.limits.storage, 
                  percentage: (response.data.usage.storage / response.data.limits.storage) * 100 
                },
                apiCalls: { 
                  current: response.data.usage.api_calls, 
                  limit: response.data.limits.api_calls, 
                  percentage: (response.data.usage.api_calls / response.data.limits.api_calls) * 100 
                },
              },
              growthTrends: {
                farmers: [10, 15, 25, 30, 45, 50, 65],
                revenue: [1000, 1200, 1500, 1800, 2100, 2400, 2700],
                apiUsage: [100, 150, 200, 250, 300, 350, 400],
              },
              healthScore: Math.floor(Math.random() * 40) + 60,
              lastActivityDate: new Date().toISOString(),
            }
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching metrics for tenant ${tenant.id}:`, error);
        return null;
      }
    });

    const results = await Promise.all(metricsPromises);
    const metricsMap: Record<string, TenantMetrics> = {};
    
    results.forEach((result) => {
      if (result) {
        metricsMap[result.tenantId] = result.metrics;
      }
    });

    setTenantMetrics(metricsMap);
  };

  const handleCreateTenant = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      console.log('Creating tenant with data:', formData);
      
      const result = await TenantService.createTenant(formData);
      console.log('Create tenant result:', result);

      if (result.success) {
        console.log('Tenant created successfully');
        resetForm();
        await fetchTenants();
        toast({
          title: "Success",
          description: "Tenant created successfully",
        });
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTenant = async (editingTenant: Tenant) => {
    if (!editingTenant || isSubmitting) {
      console.error('No tenant selected for editing');
      return false;
    }

    try {
      setIsSubmitting(true);
      console.log('Updating tenant with data:', formData);
      
      const updatedTenant = await TenantService.updateTenant(editingTenant, formData);
      console.log('Tenant updated successfully:', updatedTenant);

      setTenants(prev => prev.map(t => t.id === editingTenant.id ? updatedTenant : t));
      resetForm();
      
      toast({
        title: "Success",
        description: "Tenant updated successfully",
      });
      return true;
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update tenant",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('Deleting tenant:', tenantId);
      await TenantService.deleteTenant(tenantId);
      console.log('Tenant deleted successfully');

      setTenants(prev => prev.filter(t => t.id !== tenantId));
      toast({
        title: "Success",
        description: "Tenant deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete tenant",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    console.log('Resetting form to default values');
    setFormData({
      name: '',
      slug: '',
      type: 'agri_company',
      status: 'trial',
      subscription_plan: 'Kisan_Basic',
      max_farmers: 1000,
      max_dealers: 50,
      max_products: 100,
      max_storage_gb: 10,
      max_api_calls_per_day: 10000,
    });
  };

  const populateFormForEdit = (tenant: Tenant) => {
    console.log('Populating form for edit:', tenant);
    
    // Safely handle metadata and business_address
    const metadata = tenant.metadata && typeof tenant.metadata === 'object' 
      ? tenant.metadata as Record<string, any>
      : {};
    
    const businessAddress = tenant.business_address && typeof tenant.business_address === 'object'
      ? tenant.business_address as Record<string, any>
      : tenant.business_address
        ? { address: tenant.business_address }
        : undefined;
    
    setFormData({
      name: tenant.name || '',
      slug: tenant.slug || '',
      type: (tenant.type as any) || 'agri_company',
      status: (tenant.status as any) || 'trial',
      owner_name: tenant.owner_name || '',
      owner_email: tenant.owner_email || '',
      owner_phone: tenant.owner_phone || '',
      business_registration: tenant.business_registration || '',
      business_address: businessAddress,
      established_date: tenant.established_date || '',
      subscription_plan: tenant.subscription_plan || 'Kisan_Basic',
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
      metadata,
    });
  };

  return {
    // State
    tenants,
    loading,
    error,
    isSubmitting,
    tenantMetrics,
    viewPreferences,
    formData,
    
    // Actions
    setViewPreferences,
    setFormData,
    handleCreateTenant,
    handleUpdateTenant,
    handleDeleteTenant,
    resetForm,
    populateFormForEdit,
    fetchTenants,
    setError,
  };
};