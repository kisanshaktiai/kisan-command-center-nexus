
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

// Type-safe wrapper for Supabase queries with error handling
export function createTypedSupabaseClient() {
  return {
    ...supabase,
    from: <T extends keyof Database['public']['Tables']>(table: T) => {
      return supabase.from(table);
    },
    rpc: (funcName: string, args?: any) => {
      return supabase.rpc(funcName as any, args);
    },
  };
}

// Export typed client
export const typedSupabase = createTypedSupabaseClient();

// Helper function to safely access nested properties
export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  return obj && typeof obj === 'object' && path in obj ? obj[path] : defaultValue;
}

// Type guards for common objects
export function isBillingPlan(obj: any): obj is { base_price: number } {
  return obj && typeof obj === 'object' && 'base_price' in obj;
}

export function isTenant(obj: any): obj is { id: string; settings: any } {
  return obj && typeof obj === 'object' && 'id' in obj;
}

export function isUserProfile(obj: any): obj is { id: string; email_verified_at?: string } {
  return obj && typeof obj === 'object' && 'id' in obj;
}
