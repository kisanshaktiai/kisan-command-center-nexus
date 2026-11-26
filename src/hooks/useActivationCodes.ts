// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007  (NEW FILE)
// PATH: src/hooks/useActivationCodes.ts
//
// CHANGE LOG
// 2026-11-25 — Farmer activation codes: query/mutation hooks over ActivationCodeService, same shape
//   as useAiKeyPool (react-query). Plain codes are never put in the query cache: revealing them is a
//   plain service call made by the download handler.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivationCodeService,
  type ActivationState,
  type GenerateBatchInput,
  type SetEntitlementInput,
} from '@/services/ActivationCodeService';

const KEY = 'activation-codes';

export const useActivationTenants = () =>
  useQuery({ queryKey: [KEY, 'tenants'], queryFn: () => ActivationCodeService.getTenants(), staleTime: 5 * 60_000 });

export const useFarmerPlans = (tenantId: string | null) =>
  useQuery({
    queryKey: [KEY, 'plans', tenantId],
    queryFn: () => ActivationCodeService.getFarmerPlans(tenantId as string),
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
  });

export const useActivationUsage = (tenantId: string | null) =>
  useQuery({
    queryKey: [KEY, 'usage', tenantId],
    queryFn: () => ActivationCodeService.getUsage(tenantId as string),
    enabled: !!tenantId,
    refetchInterval: 60_000,
  });

export const useActivationBatches = (tenantId: string | null) =>
  useQuery({
    queryKey: [KEY, 'batches', tenantId],
    queryFn: async () => {
      const [batches, counts] = await Promise.all([
        ActivationCodeService.getBatches(tenantId as string),
        ActivationCodeService.getBatchStateCounts(tenantId as string),
      ]);
      return { batches, counts };
    },
    enabled: !!tenantId,
  });

export const useActivationCodes = (tenantId: string | null, batchId: string | null, state: ActivationState | null, enabled: boolean) =>
  useQuery({
    queryKey: [KEY, 'codes', tenantId, batchId, state],
    queryFn: () => ActivationCodeService.getCodes(tenantId as string, batchId, state),
    enabled: !!tenantId && enabled,
  });

export const useActivationHistory = (tenantId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: [KEY, 'history', tenantId],
    queryFn: () => ActivationCodeService.getHistory(tenantId as string),
    enabled: !!tenantId && enabled,
  });

/** Every change touches usage, batches, codes and the history of that tenant. */
const useInvalidateTenant = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [KEY] });
};

export const useSetEntitlement = () => {
  const invalidate = useInvalidateTenant();
  return useMutation({ mutationFn: (input: SetEntitlementInput) => ActivationCodeService.setEntitlement(input), onSuccess: invalidate });
};

export const useGenerateBatch = () => {
  const invalidate = useInvalidateTenant();
  return useMutation({ mutationFn: (input: GenerateBatchInput) => ActivationCodeService.generateBatch(input), onSuccess: invalidate });
};

export const useReleaseBatch = () => {
  const invalidate = useInvalidateTenant();
  return useMutation({ mutationFn: (batchId: string) => ActivationCodeService.releaseBatch(batchId), onSuccess: invalidate });
};

export const useRevokeCodes = () => {
  const invalidate = useInvalidateTenant();
  return useMutation({
    mutationFn: (args: { batchId?: string | null; codeIds?: string[] | null; reason: string }) => ActivationCodeService.revoke(args),
    onSuccess: invalidate,
  });
};
