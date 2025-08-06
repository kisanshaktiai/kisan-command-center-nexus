
/**
 * Environment configuration
 * All environment variables should be accessed through this centralized config
 */

export const environment = {
  // Supabase Configuration
  supabase: {
    url: 'https://qfklkkzxemsbeniyugiz.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFma2xra3p4ZW1zYmVuaXl1Z2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MjcxNjUsImV4cCI6MjA2ODAwMzE2NX0.dUnGp7wbwYom1FPbn_4EGf3PWjgmr8mXwL2w2SdYOh4',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Application Configuration
  app: {
    name: 'AgriTech SaaS Platform',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.NODE_ENV === 'development',
  },

  // Feature Flags
  features: {
    enableAnalytics: process.env.NODE_ENV === 'production',
    enableErrorTracking: process.env.NODE_ENV === 'production',
    enableDebugLogs: process.env.NODE_ENV === 'development',
  },

  // Security Configuration
  security: {
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: 5,
    passwordMinLength: 8,
  },
} as const;

// Type for environment config
export type Environment = typeof environment;

// Validation function to ensure required environment variables are set
export function validateEnvironment(): void {
  const required = [
    'supabase.url',
    'supabase.anonKey',
  ];

  const missing = required.filter(key => {
    const value = key.split('.').reduce((obj, k) => obj?.[k], environment as any);
    return !value;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
