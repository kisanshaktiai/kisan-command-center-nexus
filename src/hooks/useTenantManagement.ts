import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useTenants, useCreateTenant, useUpdateTenant } from '@/data/hooks/useTenants';
import { Tenant, TenantFormData } from '@/types/tenant';
import { TenantViewPreferences, TenantMetrics } from '@/types/tenantView';
import { supabase } from '@/integrations/supabase/client';

interface SecurityContext {
  requestId?: string;
  correlationId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export const useTenantManagement = () => {
  const [tenantMetrics, setTenantMetrics] = useState<Record<string, TenantMetrics>>({});
  const [creationSuccess, setCreationSuccess] = useState<{
    tenantName: string;
    adminEmail: string;
    hasEmailSent: boolean;
    correlationId?: string;
    warnings?: string[];
  } | null>(null);
  const { toast } = useToast();

  // Use React Query hooks
  const { data: tenants = [], isLoading: loading, error: queryError } = useTenants();
  const createTenantMutation = useCreateTenant();
  const updateTenantMutation = useUpdateTenant();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [securityContext, setSecurityContext] = useState<SecurityContext>({});

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
    owner_name: '',
    owner_email: '',
    subdomain: '',
  });

  // Initialize security context
  useEffect(() => {
    const initSecurityContext = () => {
      const sessionId = sessionStorage.getItem('session_id') || 
                       `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);

      setSecurityContext({
        sessionId,
        userAgent: navigator.userAgent,
        requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
    };

    initSecurityContext();
  }, []);

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

  /**
   * Enhanced email validation
   */
  const validateEmailFormat = (email: string): { isValid: boolean; error?: string } => {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'Email is required' };
    }

    const trimmedEmail = email.trim();
    
    if (trimmedEmail.length === 0) {
      return { isValid: false, error: 'Email cannot be empty' };
    }

    if (trimmedEmail.length > 254) {
      return { isValid: false, error: 'Email address is too long' };
    }

    // Enhanced email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(trimmedEmail)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true };
  };

  /**
   * Generate idempotency key for tenant creation
   */
  const generateIdempotencyKey = (formData: TenantFormData): string => {
    const keyData = {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      owner_email: formData.owner_email.trim(),
      timestamp: Math.floor(Date.now() / 60000) // 1-minute window
    };
    return btoa(JSON.stringify(keyData));
  };

  const handleCreateTenant = async () => {
    if (isSubmitting) return false;
    
    try {
      setIsSubmitting(true);
      setCreationSuccess(null);
      
      const correlationId = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Creating tenant with enhanced security:', { 
        ...formData, 
        correlationId,
        securityContext 
      });

      // Enhanced client-side validation
      if (!formData.name?.trim()) {
        throw new Error('Organization name is required');
      }
      
      if (!formData.slug?.trim()) {
        throw new Error('Slug is required');
      }

      if (!formData.owner_email?.trim()) {
        throw new Error('Admin email is required');
      }

      if (!formData.owner_name?.trim()) {
        throw new Error('Admin name is required');
      }

      // Enhanced email validation
      const emailValidation = validateEmailFormat(formData.owner_email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.error);
      }

      // Generate idempotency key
      const idempotencyKey = generateIdempotencyKey(formData);
      
      // Map form data to CreateTenantDTO with security context
      const createData = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        type: formData.type,
        subscription_plan: formData.subscription_plan,
        owner_email: formData.owner_email.trim(),
        owner_name: formData.owner_name.trim(),
        metadata: {
          ...formData.metadata,
          created_via: 'admin_ui',
          security_context: securityContext,
          correlation_id: correlationId
        }
      };

      // Call the enhanced Edge Function with security headers
      const { data, error } = await supabase.functions.invoke('create-tenant-with-admin', {
        body: createData,
        headers: {
          'Idempotency-Key': idempotencyKey,
          'X-Request-ID': securityContext.requestId || correlationId,
          'X-Session-ID': securityContext.sessionId,
          'X-Correlation-ID': correlationId
        }
      });

      if (error) {
        console.error('Enhanced tenant creation error:', error);
        throw new Error(error.message || 'Failed to create tenant');
      }

      if (!data?.success) {
        console.error('Enhanced tenant creation returned error:', data?.error);
        throw new Error(data?.error || 'Failed to create tenant');
      }

      console.log('Enhanced tenant creation successful:', data);

      // Set enhanced success state for feedback
      setCreationSuccess({
        tenantName: formData.name,
        adminEmail: formData.owner_email,
        hasEmailSent: data.emailSent || false,
        correlationId: data.correlationId,
        warnings: data.warnings
      });

      // Enhanced success toast with security context
      const toastMessage = data.emailSent 
        ? `Welcome email sent to ${formData.owner_email} with login credentials.`
        : `Tenant created successfully. Email delivery may have failed - please check email settings.`;

      toast({
        title: "Tenant Created Successfully",
        description: toastMessage,
        variant: "default",
      });

      // Show warnings if present
      if (data.warnings && data.warnings.length > 0) {
        setTimeout(() => {
          toast({
            title: "Note",
            description: data.warnings.join('; '),
            variant: "default",
          });
        }, 2000);
      }

      resetForm();
      return true;
    } catch (error: any) {
      console.error('Enhanced tenant creation error:', error);
      
      // Enhanced error handling with security context
      let errorMessage = "Failed to create tenant";
      
      if (error.message?.includes('Slug already exists')) {
        errorMessage = "A tenant with this slug already exists";
      } else if (error.message?.includes('Admin access required')) {
        errorMessage = "You don't have permission to create tenants";
      } else if (error.message?.includes('Missing required fields')) {
        errorMessage = "Please fill in all required fields";
      } else if (error.message?.includes('Invalid email format')) {
        errorMessage = "Please enter a valid email address";
      } else if (error.message?.includes('Rate limit exceeded')) {
        errorMessage = "Too many requests. Please wait before creating another tenant";
      } else if (error.message?.includes('DUPLICATE_REQUEST')) {
        errorMessage = "A tenant creation is already in progress with the same details";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error Creating Tenant",
        description: errorMessage,
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
      console.log('Updating tenant with enhanced security:', formData);
      
      // Map form data to UpdateTenantDTO with security context
      // Make sure we don't pass any invalid enum values
      const updateData = {
        name: formData.name,
        status: formData.status,
        subscription_plan: formData.subscription_plan,
        metadata: {
          updated_via: 'admin_ui',
          security_context: securityContext,
          last_updated: new Date().toISOString()
          // Remove any role-related fields that might cause enum issues
        }
      };

      await updateTenantMutation.mutateAsync({ 
        id: editingTenant.id, 
        data: updateData 
      });

      toast({
        title: "Success",
        description: "Tenant updated successfully",
        variant: "default",
      });

      resetForm();
      return true;
    } catch (error: any) {
      console.error('Enhanced tenant update error:', error);
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
      console.log('Deleting tenant with enhanced security:', tenantId);
      
      // For now, we'll implement soft delete by updating status with security context
      await updateTenantMutation.mutateAsync({
        id: tenantId,
        data: { 
          status: 'cancelled',
          metadata: {
            deleted_via: 'admin_ui',
            security_context: securityContext,
            deleted_at: new Date().toISOString()
          }
        }
      });
      
      toast({
        title: "Success",
        description: "Tenant deleted successfully",
      });
    } catch (error: any) {
      console.error('Enhanced tenant delete error:', error);
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
      owner_name: '',
      owner_email: '',
      subdomain: '',
    });
    setCreationSuccess(null);
  };

  const populateFormForEdit = (tenant: Tenant) => {
    console.log('Populating form for edit with enhanced security:', tenant);
    
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
    console.log('Fetch tenants called - handled by React Query with enhanced security');
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
    creationSuccess,
    securityContext,
    
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
    setCreationSuccess,
    validateEmailFormat,
  };
};
