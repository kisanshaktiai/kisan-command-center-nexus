import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface TenantRealTimeData {
  farmerCount: number;
  lastLogin: string | null;
}

export const useTenantRealTimeData = (tenantId: string | undefined) => {
  const queryClient = useQueryClient();

  // Set up real-time subscription for farmer changes
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`tenant-farmers-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'farmers',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          // Invalidate and refetch when farmers table changes
          queryClient.invalidateQueries({ queryKey: ['tenant-realtime-data', tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  return useQuery({
    queryKey: ['tenant-realtime-data', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        return { farmerCount: 0, lastLogin: null };
      }

      // Fetch farmer count
      const { count: farmerCount, error: farmerError } = await supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (farmerError) {
        console.error('Error fetching farmer count:', farmerError);
      }

      // Fetch last login from farmers
      const { data: lastLoginData, error: loginError } = await supabase
        .from('farmers')
        .select('last_login_at')
        .eq('tenant_id', tenantId)
        .not('last_login_at', 'is', null)
        .order('last_login_at', { ascending: false })
        .limit(1);

      if (loginError) {
        console.error('Error fetching last login:', loginError);
      }

      const lastLogin = lastLoginData?.[0]?.last_login_at 
        ? new Date(lastLoginData[0].last_login_at).toLocaleString()
        : null;

      return {
        farmerCount: farmerCount || 0,
        lastLogin,
      } as TenantRealTimeData;
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 15000, // Consider data fresh for 15 seconds
  });
};