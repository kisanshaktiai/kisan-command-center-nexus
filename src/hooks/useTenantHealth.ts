import { useQuery } from '@tanstack/react-query';
import { TenantHealthService } from '@/services/TenantHealthService';

export const useTenantHealthAll = () =>
  useQuery({
    queryKey: ['tenant-health', 'all'],
    queryFn: () => TenantHealthService.getLatestForAll(),
    staleTime: 60_000,
  });

export const useTenantHealthHistory = (tenantId?: string, days = 30) =>
  useQuery({
    queryKey: ['tenant-health', 'history', tenantId, days],
    queryFn: () => TenantHealthService.getHistory(tenantId!, days),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
