import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface TenantRealTimeData {
  farmerCount: number;
  lastLogin: string | null;
}

export const useTenantRealTimeData = (tenantId: string | undefined) => {
  const queryClient = useQueryClient();

  // Realtime subscription to farmer table
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

      // Count active farmers
      const { count: farmerCount, error: farmerError } = await supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (farmerError) {
        console.error('Error fetching farmer count:', farmerError);
      }

      // Latest login
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

      // Format last login into full date + time (IST)
      const lastLogin = lastLoginData?.[0]?.last_login_at
        ? new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata', // Always IST
          }).format(new Date(lastLoginData[0].last_login_at))
        : null;

      return {
        farmerCount: farmerCount || 0,
        lastLogin,
      } as TenantRealTimeData;
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Poll every 30s
    staleTime: 15000,       // Keep fresh for 15s
  });
};
