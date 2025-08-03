
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { metricsService } from '@/domain/metrics/metricsService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: [],
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { id: '1', metric_name: 'test' },
              error: null
            }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: '1', amount: 100 },
            error: null
          }))
        }))
      }))
    }))
  }
}));

describe('MetricsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSystemMetrics', () => {
    it('should fetch system metrics successfully', async () => {
      const mockData = [
        { id: '1', metric_name: 'cpu_usage', value: 75, timestamp: '2024-01-01' }
      ];
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: mockData,
              error: null
            })
          })
        })
      } as any);

      const result = await metricsService.getSystemMetrics();
      expect(result).toEqual(mockData);
    });

    it('should throw error when database query fails', async () => {
      const mockError = new Error('Database connection failed');
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: mockError
            })
          })
        })
      } as any);

      await expect(metricsService.getSystemMetrics()).rejects.toThrow(mockError);
    });
  });

  describe('updateSystemMetric', () => {
    it('should update system metric successfully', async () => {
      const mockUpdatedMetric = { id: '1', metric_name: 'cpu_usage', value: 80 };
      
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedMetric,
                error: null
              })
            })
          })
        })
      } as any);

      const result = await metricsService.updateSystemMetric('1', { value: 80 });
      expect(result).toEqual(mockUpdatedMetric);
    });
  });
});
