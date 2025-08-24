
// DEPRECATED: This file now re-exports from centralized types for backward compatibility
// All types have been moved to /types/tenant/index.ts

// Re-export everything from the centralized tenant types
export * from '@/types/tenant';

// Note: We don't need explicit re-exports here anymore since we're using export * above
// This eliminates the "Duplicate identifier" errors while maintaining backward compatibility
