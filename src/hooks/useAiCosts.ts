import { useQuery } from '@tanstack/react-query';
import { AiCostService } from '@/services/AiCostService';

export const useAiCosts = (days: number) =>
  useQuery({
    queryKey: ['ai-costs', days],
    queryFn: () => AiCostService.getSummary(days),
    staleTime: 60_000,
  });
