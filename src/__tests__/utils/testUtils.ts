
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

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
  getTenants: jest.Mock;
  getTenant: jest.Mock;
  createTenant: jest.Mock;
  updateTenant: jest.Mock;
  deleteTenant: jest.Mock;
}

export const createMockTenantRepository = (): MockTenantRepository => ({
  getTenants: jest.fn(),
  getTenant: jest.fn(),
  createTenant: jest.fn(),
  updateTenant: jest.fn(),
  deleteTenant: jest.fn(),
});

// Test hook wrapper with mocked dependencies
export const renderHookWithMocks = <T>(
  hook: () => T,
  options: {
    queryClient?: QueryClient;
    mockRepository?: MockTenantRepository;
  } = {}
) => {
  const { queryClient, mockRepository } = options;
  
  return renderHook(hook, {
    wrapper: createQueryWrapper(queryClient),
  });
};
