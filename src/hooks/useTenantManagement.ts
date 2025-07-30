
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useTenants, useCreateTenant, useUpdateTenant } from '@/data/hooks/useTenants';
import { Tenant, TenantFormData } from '@/types/tenant';
import { TenantViewPreferences, TenantMetrics } from '@/types/tenantView';
import { supabase } from '@/integrations/supabase/client';

export const useTenantManagement = () => {
  const [tenantMetrics, setTenantMetrics] = useState<Record<string, TenantMetrics>>({});
  const { toast } = useToast();

  // Use React Query hooks
  const { data: tenants = [], isLoading: loading, error: queryError } = useTenants();
  const createTenantMutation = useCreateTenant();
  const updateTenantMutation = useUpdateTenant();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (queryError) {
      setError(queryError.message || 'Failed to fetch tenants');
    } else {
      setError(null);
    }
  }, [queryError]);

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
    if (isSubmitting) return false;
    
    try {
      setIsSubmitting(true);
      console.log('Creating tenant with form data:', formData);
      
      // Map form data to CreateTenantDTO
      const createData = {
        name: formData.name,
        slug: formData.slug,
        type: formData.type,
        subscription_plan: formData.subscription_plan,
        owner_email: formData.owner_email || '',
        owner_name: formData.owner_name || '',
        metadata: formData.metadata || {}
      };

      await createTenantMutation.mutateAsync(createData);
      resetForm();
      return true;
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
      
      // Map form data to UpdateTenantDTO
      const updateData = {
        name: formData.name,
        status: formData.status,
        subscription_plan: formData.subscription_plan,
        metadata: formData.metadata
      };

      await updateTenantMutation.mutateAsync({ 
        id: editingTenant.id, 
        data: updateData 
      });
      resetForm();
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
      // For now, we'll implement soft delete by updating status
      await updateTenantMutation.mutateAsync({
        id: tenantId,
        data: { status: 'cancelled' }
      });
      
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

  const fetchTenants = async () => {
    // This is handled by React Query automatically
    console.log('Fetch tenants called - handled by React Query');
  };

  return {
    // State
    tenants,
    loading: loading || isSubmitting,
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
