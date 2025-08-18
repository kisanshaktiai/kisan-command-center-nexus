
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminRegistration {
  id: string;
  email: string;
  status: string;
  created_at: string;
}

interface AdminRegistrationsResponse {
  registrations: AdminRegistration[];
}

export const useAdminRegistrations = () => {
  return useQuery({
    queryKey: ['admin-registrations'],
    queryFn: async (): Promise<AdminRegistration[]> => {
      console.log('Fetching admin registrations via edge function...');
      
      const { data, error } = await supabase.functions.invoke('get-admin-registrations');

      if (error) {
        console.error('Admin registrations error:', error);
        throw new Error(error.message || 'Failed to fetch admin registrations');
      }
      
      console.log('Admin registrations response:', data);
      const response = data as AdminRegistrationsResponse;
      return response.registrations || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      // Don't retry on permission errors
      if (error?.message?.includes('permission') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};
