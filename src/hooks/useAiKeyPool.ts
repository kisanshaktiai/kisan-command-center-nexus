// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007  (NEW FILE)
// PATH: src/hooks/useAiKeyPool.ts
//
// CHANGE LOG
// 2026-10-03 — AI control plane Phase 2a (key pool): query/mutation hooks over AiKeyPoolService,
//   same shape as useAiRegistry (react-query). Usage refreshes every 60 s while the screen is open,
//   matching the router's own 60 s pool-usage cache.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AiKeyPoolService, type AiKeySlotUpdate, type AiProvider } from '@/services/AiKeyPoolService';

export const useAiKeySlots = () =>
  useQuery({
    queryKey: ['ai-key-pool', 'slots'],
    queryFn: () => AiKeyPoolService.getSlots(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

export const useAiModelGroups = () =>
  useQuery({
    queryKey: ['ai-key-pool', 'groups'],
    queryFn: () => AiKeyPoolService.getGroups(),
    staleTime: 60_000,
  });

export const useAiKeyRecentUsage = (days = 7) =>
  useQuery({
    queryKey: ['ai-key-pool', 'usage', days],
    queryFn: () => AiKeyPoolService.getRecentUsage(days),
    staleTime: 60_000,
  });

export const useUpdateAiKeySlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, slotNo, patch }: { provider: AiProvider; slotNo: number; patch: AiKeySlotUpdate }) =>
      AiKeyPoolService.updateSlot(provider, slotNo, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-key-pool', 'slots'] });
      queryClient.invalidateQueries({ queryKey: ['ai-registry', 'history'] });
    },
  });
};

export const useCheckAiKeys = () =>
  useMutation({
    mutationFn: (probe: boolean) => AiKeyPoolService.checkKeys(probe),
  });
