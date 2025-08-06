
import { renderHook } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { useLeads, useUpdateLeadStatus, useConvertLeadToTenant } from '@/hooks/useLeadManagement';
import { LeadService } from '@/services/LeadService';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/services/LeadService');
vi.mock('@/integrations/supabase/client');
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showLoading: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

describe('useLeadManagement hooks', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  describe('useLeads', () => {
    it('should fetch leads successfully', async () => {
      const mockLeads = [
        {
          id: '1',
          contact_name: 'John Doe',
          email: 'john@example.com',
          status: 'new' as const,
          priority: 'medium' as const,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          qualification_score: 0,
        },
      ];

      (LeadService.getLeads as Mock).mockResolvedValue({
        success: true,
        data: mockLeads,
      });

      const { result } = renderHook(() => useLeads(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLeads);
    });
  });

  describe('useUpdateLeadStatus', () => {
    it('should update lead status successfully', async () => {
      const mockUpdatedLead = {
        id: '1',
        contact_name: 'John Doe',
        email: 'john@example.com',
        status: 'contacted' as const,
        priority: 'medium' as const,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        qualification_score: 0,
      };

      (LeadService.updateLead as Mock).mockResolvedValue({
        success: true,
        data: mockUpdatedLead,
      });

      const { result } = renderHook(() => useUpdateLeadStatus(), { wrapper });

      await waitFor(() => {
        result.current.mutate({
          leadId: '1',
          status: 'contacted',
          notes: 'Test note',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(LeadService.updateLead).toHaveBeenCalledWith('1', {
        status: 'contacted',
        notes: 'Test note',
        last_contact_at: expect.any(String),
      });
    });
  });

  describe('useConvertLeadToTenant', () => {
    it('should convert lead to tenant successfully', async () => {
      const mockResponse = {
        success: true,
        tenant_id: 'tenant-1',
        temp_password: 'temp123',
      };

      (supabase.functions.invoke as Mock).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useConvertLeadToTenant(), { wrapper });

      await waitFor(() => {
        result.current.mutate({
          leadId: '1',
          tenantName: 'Test Tenant',
          tenantSlug: 'test-tenant',
          subscriptionPlan: 'Kisan_Basic',
          adminEmail: 'admin@example.com',
          adminName: 'Admin User',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('convert-lead-to-tenant', {
        body: {
          leadId: '1',
          tenantName: 'Test Tenant',
          tenantSlug: 'test-tenant',
          subscriptionPlan: 'Kisan_Basic',
          adminEmail: 'admin@example.com',
          adminName: 'Admin User',
        },
      });
    });

    it('should handle conversion errors properly', async () => {
      const mockError = {
        success: false,
        error: 'Slug already exists',
        code: 'SLUG_CONFLICT',
      };

      (supabase.functions.invoke as Mock).mockResolvedValue({
        data: mockError,
        error: null,
      });

      const { result } = renderHook(() => useConvertLeadToTenant(), { wrapper });

      await waitFor(() => {
        result.current.mutate({
          leadId: '1',
          tenantName: 'Test Tenant',
          tenantSlug: 'existing-slug',
          subscriptionPlan: 'Kisan_Basic',
          adminEmail: 'admin@example.com',
          adminName: 'Admin User',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(expect.objectContaining({
        message: 'Slug already exists',
      }));
    });
  });
});
