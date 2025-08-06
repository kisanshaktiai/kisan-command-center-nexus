
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLeads } from '@/hooks/useLeadManagement';
import { LeadService } from '@/services/LeadService';

// Mock LeadService
vi.mock('@/services/LeadService', () => ({
  LeadService: {
    getLeads: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useLeads', () => {
  it('should fetch leads successfully', async () => {
    const mockLeads = [
      { id: '1', contact_name: 'John Doe', email: 'john@example.com', status: 'new' },
    ];

    vi.mocked(LeadService.getLeads).mockResolvedValue({
      success: true,
      data: mockLeads,
    });

    const { result } = renderHook(() => useLeads(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockLeads);
  });

  it('should handle errors', async () => {
    vi.mocked(LeadService.getLeads).mockResolvedValue({
      success: false,
      error: 'Failed to fetch leads',
    });

    const { result } = renderHook(() => useLeads(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
