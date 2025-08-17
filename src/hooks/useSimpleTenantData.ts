
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SimpleTenantData {
  id: string;
  name: string;
  subscription_plan: string;
  status: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  business_registration?: string;
  business_address?: any; // Changed from string to any to handle Json type
  metadata?: Record<string, any>;
}

interface UseSimpleTenantDataOptions {
  tenantId: string;
  enabled?: boolean;
}

// Helper function to safely convert business_address to string
const formatBusinessAddress = (address: any): string => {
  if (!address) return '';
  
  if (typeof address === 'string') {
    return address;
  }
  
  if (typeof address === 'object') {
    // If it's an object, try to format it as a readable address
    const parts = [
      address.street,
      address.city,
      address.state,
      address.postal_code,
      address.country
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : '';
  }
  
  // For any other type, convert to string
  return String(address);
};

export const useSimpleTenantData = ({ tenantId, enabled = true }: UseSimpleTenantDataOptions) => {
  return useQuery({
    queryKey: ['simple-tenant-data', tenantId],
    queryFn: async (): Promise<SimpleTenantData | null> => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      console.log('🔍 Fetching tenant data for:', tenantId);

      const { data: tenant, error } = await supabase
        .from('tenants')
        .select(`
          id,
          name,
          subscription_plan,
          status,
          owner_name,
          owner_email,
          owner_phone,
          business_registration,
          business_address,
          metadata
        `)
        .eq('id', tenantId)
        .maybeSingle(); // Changed from single() to maybeSingle()

      if (error) {
        console.error('❌ Error fetching tenant:', error);
        throw new Error(`Failed to fetch tenant: ${error.message}`);
      }

      if (!tenant) {
        console.log('⚠️ No tenant found with ID:', tenantId);
        return null;
      }

      console.log('✅ Successfully fetched tenant:', tenant.name);
      
      // Transform the data to handle type conversions
      return {
        id: tenant.id,
        name: tenant.name,
        subscription_plan: tenant.subscription_plan,
        status: tenant.status,
        owner_name: tenant.owner_name,
        owner_email: tenant.owner_email,
        owner_phone: tenant.owner_phone,
        business_registration: tenant.business_registration,
        business_address: formatBusinessAddress(tenant.business_address),
        metadata: tenant.metadata as Record<string, any>
      };
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};
