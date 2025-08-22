
// Type guard utilities for better runtime type safety
import { User, Session } from '@supabase/supabase-js';
import { AuthState, UserProfile } from '@/types/auth';
import { Tenant } from '@/types/tenant';

export class TypeGuards {
  /**
   * Check if a value is a non-null object
   */
  static isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Check if a value is a non-empty string
   */
  static isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
  }

  /**
   * Check if a value is a valid UUID
   */
  static isUUID(value: unknown): value is string {
    if (!this.isNonEmptyString(value)) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  /**
   * Check if a value is a valid email
   */
  static isEmail(value: unknown): value is string {
    if (!this.isNonEmptyString(value)) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Check if a value is a Supabase User
   */
  static isSupabaseUser(value: unknown): value is User {
    return this.isObject(value) && 
           this.isUUID(value.id) && 
           this.isEmail(value.email);
  }

  /**
   * Check if a value is a Supabase Session
   */
  static isSupabaseSession(value: unknown): value is Session {
    return this.isObject(value) && 
           this.isSupabaseUser(value.user) &&
           this.isNonEmptyString(value.access_token);
  }

  /**
   * Check if a value is a valid AuthState
   */
  static isAuthState(value: unknown): value is AuthState {
    if (!this.isObject(value)) return false;
    
    return (value.user === null || this.isSupabaseUser(value.user)) &&
           (value.session === null || this.isSupabaseSession(value.session)) &&
           typeof value.isAuthenticated === 'boolean' &&
           typeof value.isAdmin === 'boolean' &&
           typeof value.isSuperAdmin === 'boolean' &&
           (value.adminRole === null || this.isNonEmptyString(value.adminRole)) &&
           (value.profile === null || this.isUserProfile(value.profile));
  }

  /**
   * Check if a value is a valid UserProfile
   */
  static isUserProfile(value: unknown): value is UserProfile {
    if (!this.isObject(value)) return false;
    
    return this.isUUID(value.id) &&
           this.isEmail(value.email) &&
           this.isNonEmptyString(value.created_at) &&
           this.isNonEmptyString(value.updated_at);
  }

  /**
   * Check if a value is a valid Tenant
   */
  static isTenant(value: unknown): value is Tenant {
    if (!this.isObject(value)) return false;
    
    return this.isUUID(value.id) &&
           this.isNonEmptyString(value.name) &&
           this.isNonEmptyString(value.slug) &&
           this.isNonEmptyString(value.type) &&
           this.isNonEmptyString(value.status) &&
           this.isNonEmptyString(value.subscription_plan) &&
           this.isNonEmptyString(value.created_at) &&
           this.isNonEmptyString(value.updated_at);
  }

  /**
   * Check if an array contains only items of a specific type
   */
  static isArrayOf<T>(
    value: unknown,
    typeGuard: (item: unknown) => item is T
  ): value is T[] {
    return Array.isArray(value) && value.every(typeGuard);
  }

  /**
   * Assert that a value matches a type guard, throwing if not
   */
  static assert<T>(
    value: unknown,
    typeGuard: (value: unknown) => value is T,
    errorMessage: string
  ): asserts value is T {
    if (!typeGuard(value)) {
      throw new Error(errorMessage);
    }
  }
}
