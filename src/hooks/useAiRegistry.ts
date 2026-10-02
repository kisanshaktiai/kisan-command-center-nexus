// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007  (NEW FILE)
// PATH: src/hooks/useAiRegistry.ts
//
// CHANGE LOG
// 2026-10-01 — AI control plane Phase 1 (read-only): query hooks over AiRegistryService, same
//   shape as useAiCosts (react-query, 60 s staleTime).
import { useQuery } from '@tanstack/react-query';
import { AiRegistryService } from '@/services/AiRegistryService';

export const useAiFeatureRoutes = () =>
  useQuery({
    queryKey: ['ai-registry', 'features'],
    queryFn: () => AiRegistryService.getFeaturesWithRoutes(),
    staleTime: 60_000,
  });

export const useAiModels = () =>
  useQuery({
    queryKey: ['ai-registry', 'models'],
    queryFn: () => AiRegistryService.getModels(),
    staleTime: 60_000,
  });

export const useAiChangeHistory = (limit = 200) =>
  useQuery({
    queryKey: ['ai-registry', 'history', limit],
    queryFn: () => AiRegistryService.getChangeHistory(limit),
    staleTime: 60_000,
  });
