// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007
// PATH: src/hooks/useAiRegistry.ts
//
// CHANGE LOG
// 2026-10-04 — AI control plane Phase 2b (admin writes): mutation hooks over the new
//   AiRegistryService write methods, following useAiKeyPool's pattern. Every mutation invalidates
//   the registry queries it can affect AND the change history, because each write adds an audit row
//   the history screen shows.
// 2026-10-01 — AI control plane Phase 1 (read-only): query hooks over AiRegistryService, same
//   shape as useAiCosts (react-query, 60 s staleTime).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AiRegistryService,
  type AiModelCreate,
  type AiModelUpdate,
  type AiPriceCreate,
  type AiRouteCreate,
  type AiRouteUpdate,
} from '@/services/AiRegistryService';

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

/** Providers already present in the catalog — the model form's provider options. */
export const useAiProviders = () =>
  useQuery({
    queryKey: ['ai-registry', 'providers'],
    queryFn: () => AiRegistryService.getProviders(),
    staleTime: 60_000,
  });

/** Invalidates everything a registry write can change, including the audit history. */
const useRegistryInvalidation = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['ai-registry'] });
  };
};

export const useCreateAiModel = () => {
  const invalidate = useRegistryInvalidation();
  return useMutation({
    mutationFn: (input: AiModelCreate) => AiRegistryService.createModel(input),
    onSuccess: invalidate,
  });
};

export const useUpdateAiModel = () => {
  const invalidate = useRegistryInvalidation();
  return useMutation({
    mutationFn: ({ modelKey, patch }: { modelKey: string; patch: AiModelUpdate }) =>
      AiRegistryService.updateModel(modelKey, patch),
    onSuccess: invalidate,
  });
};

export const useUpsertAiPricing = () => {
  const invalidate = useRegistryInvalidation();
  return useMutation({
    mutationFn: (input: AiPriceCreate) => AiRegistryService.upsertPricing(input),
    onSuccess: invalidate,
  });
};

export const useCreateAiRoute = () => {
  const invalidate = useRegistryInvalidation();
  return useMutation({
    mutationFn: (input: AiRouteCreate) => AiRegistryService.createRoute(input),
    onSuccess: invalidate,
  });
};

export const useUpdateAiRoute = () => {
  const invalidate = useRegistryInvalidation();
  return useMutation({
    mutationFn: ({ taskKey, patch }: { taskKey: string; patch: AiRouteUpdate }) =>
      AiRegistryService.updateRoute(taskKey, patch),
    onSuccess: invalidate,
  });
};

export const useReplaceAiRouteSteps = () => {
  const invalidate = useRegistryInvalidation();
  return useMutation({
    mutationFn: ({ taskKey, modelKeys, changeReason }: { taskKey: string; modelKeys: string[]; changeReason: string }) =>
      AiRegistryService.replaceRouteSteps(taskKey, modelKeys, changeReason),
    onSuccess: invalidate,
  });
};
