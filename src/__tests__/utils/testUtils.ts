
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { vi } from 'vitest';

/**
 * Testing utilities for mock-friendly hook testing
 */

// Create a test query client
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

// Wrapper for hooks that need QueryClient
export const createQueryWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();
  
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client }, children)
  );
};

// Mock data factories
export const createMockTenant = (overrides = {}) => ({
  id: 'test-tenant-id',
  name: 'Test Tenant',
  slug: 'test-tenant',
  type: 'agri_company',
  status: 'active',
  subscription_plan: 'Kisan_Basic',
  owner_email: 'test@example.com',
  owner_name: 'Test Owner',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockTenantList = (count = 3) => {
  return Array.from({ length: count }, (_, index) => 
    createMockTenant({
      id: `tenant-${index + 1}`,
      name: `Tenant ${index + 1}`,
      slug: `tenant-${index + 1}`,
    })
  );
};

// Mock service interfaces
export interface MockTenantRepository {
  getTenants: ReturnType<typeof vi.fn>;
  getTenant: ReturnType<typeof vi.fn>;
  createTenant: ReturnType<typeof vi.fn>;
  updateTenant: ReturnType<typeof vi.fn>;
  deleteTenant: ReturnType<typeof vi.fn>;
}

export const createMockTenantRepository = (): MockTenantRepository => ({
  getTenants: vi.fn(),
  getTenant: vi.fn(),
  createTenant: vi.fn(),
  updateTenant: vi.fn(),
  deleteTenant: vi.fn(),
});

// Test hook wrapper with mocked dependencies
export const renderHookWithMocks = <T>(
  hook: () => T,
  options: {
    queryClient?: QueryClient;
    mockRepository?: MockTenantRepository;
  } = {}
) => {
  const { queryClient } = options;
  
  return renderHook(hook, {
    wrapper: createQueryWrapper(queryClient),
  });
};
