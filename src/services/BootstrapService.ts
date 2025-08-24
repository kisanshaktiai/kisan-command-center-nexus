
import { supabase } from '@/integrations/supabase/client';
import { authService } from '@/auth/AuthService';

export interface BootstrapServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export class BootstrapService {
  private static instance: BootstrapService;

  static getInstance(): BootstrapService {
    if (!BootstrapService.instance) {
      BootstrapService.instance = new BootstrapService();
    }
    return BootstrapService.instance;
  }

  async isBootstrapNeeded(): Promise<boolean> {
    return await authService.isBootstrapNeeded();
  }

  async bootstrapSuperAdmin(
    email: string,
    password: string,
    fullName: string
  ): Promise<BootstrapServiceResult> {
    try {
      const result = await authService.bootstrapSuperAdmin(email, password, fullName);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bootstrap failed'
      };
    }
  }
}

export const bootstrapService = BootstrapService.getInstance();
