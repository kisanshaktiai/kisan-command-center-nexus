
export const metricsQueries = {
  all: ['metrics'] as const,
  system: () => [...metricsQueries.all, 'system'] as const,
  financial: (dateRange?: { from: Date; to: Date }) => 
    [...metricsQueries.all, 'financial', dateRange] as const,
  resources: () => [...metricsQueries.all, 'resources'] as const,
  tenant: (tenantId: string) => [...metricsQueries.all, 'tenant', tenantId] as const,
};
