
import { useQuery } from '@tanstack/react-query';
import type { Lead } from '@/types/leads';

// Define valid status transitions that match database constraints
const getValidNextStatuses = (currentStatus: Lead['status']): string[] => {
  switch (currentStatus) {
    case 'new':
      return ['assigned', 'contacted'];
    case 'assigned':
      return ['contacted', 'new'];
    case 'contacted':
      return ['qualified', 'rejected', 'assigned'];
    case 'qualified':
      // Note: 'converted' is handled separately through conversion flow, not direct status update
      return ['rejected', 'contacted'];
    case 'converted':
      return []; // No transitions allowed from converted status
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
      console.log('Getting valid next statuses for:', currentStatus);
      const validStatuses = getValidNextStatuses(currentStatus);
      console.log('Valid next statuses:', validStatuses);
      return validStatuses;
    },
    enabled: !!currentStatus,
  });
};
