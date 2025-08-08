
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { BaseService, ServiceResult } from '@/services/BaseService';

export abstract class BaseQueryService extends BaseService {
  protected queryClient: ReturnType<typeof useQueryClient> | null = null;

  protected setQueryClient(client: ReturnType<typeof useQueryClient>) {
    this.queryClient = client;
  }

  protected invalidateQueries(queryKey: readonly unknown[]) {
    if (this.queryClient) {
      this.queryClient.invalidateQueries({ queryKey });
    }
  }

  protected createQuery<TData = unknown, TError = Error>(
    queryKey: readonly unknown[],
    queryFn: () => Promise<ServiceResult<TData>>,
    options?: Partial<UseQueryOptions<TData, TError>>
  ) {
    return {
      queryKey,
      queryFn: async () => {
        const result = await queryFn();
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data!;
      },
      ...options,
    };
  }

  protected createMutation<TData = unknown, TVariables = unknown, TError = Error>(
    mutationFn: (variables: TVariables) => Promise<ServiceResult<TData>>,
    options?: {
      onSuccess?: (data: TData, variables: TVariables) => void;
      onError?: (error: TError, variables: TVariables) => void;
      invalidateQueries?: readonly unknown[][];
    }
  ) {
    return {
      mutationFn: async (variables: TVariables) => {
        const result = await mutationFn(variables);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data!;
      },
      onSuccess: (data: TData, variables: TVariables) => {
        options?.onSuccess?.(data, variables);
        options?.invalidateQueries?.forEach(queryKey => {
          this.invalidateQueries(queryKey);
        });
      },
      onError: options?.onError,
    };
  }
}
