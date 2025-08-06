
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadService } from '@/services/LeadService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('LeadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLeads', () => {
    it('should fetch leads successfully', async () => {
      const mockLeads = [
        {
          id: '1',
          contact_name: 'John Doe',
          email: 'john@example.com',
          status: 'new',
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockLeads,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      } as any);

      mockSelect.mockReturnValue({
        order: mockOrder,
      });

      const result = await LeadService.getLeads();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLeads);
      expect(supabase.from).toHaveBeenCalledWith('leads');
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Database error');
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      } as any);

      const result = await LeadService.getLeads();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('updateLead', () => {
    it('should update lead successfully', async () => {
      const leadId = '123';
      const updates = { status: 'contacted' as const };
      const mockUpdatedLead = { id: leadId, ...updates };

      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockUpdatedLead,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      } as any);

      mockEq.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const result = await LeadService.updateLead(leadId, updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedLead);
    });
  });
});
