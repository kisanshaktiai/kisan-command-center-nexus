
import { useQuery } from '@tanstack/react-query';
import type { Lead } from '@/types/leads';

// Define valid status transitions locally since RPC function isn't available
const getValidNextStatuses = (currentStatus: Lead['status']): string[] => {
  switch (currentStatus) {
    case 'new':
      return ['assigned', 'contacted'];
    case 'assigned':
      return ['contacted', 'new'];
    case 'contacted':
      return ['qualified', 'rejected', 'assigned'];
    case 'qualified':
      return ['converted', 'rejected', 'contacted'];
    case 'converted':
      return [];
    case 'rejected':
      return ['new', 'assigned', 'contacted'];
    default:
      return [];
  }
};

export const useValidNextStatuses = (currentStatus: Lead['status']) => {
  return useQuery({
    queryKey: ['valid-next-statuses', currentStatus],
    queryFn: async () => {
      // Return the valid statuses directly
      return getValidNextStatuses(currentStatus);
    },
    enabled: !!currentStatus,
  });
};
