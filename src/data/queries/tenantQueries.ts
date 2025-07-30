
export const tenantQueries = {
  all: ['tenants'] as const,
  lists: () => [...tenantQueries.all, 'list'] as const,
  list: (filters: any) => [...tenantQueries.lists(), filters] as const,
  details: () => [...tenantQueries.all, 'detail'] as const,
  detail: (id: string) => [...tenantQueries.details(), id] as const,
};
