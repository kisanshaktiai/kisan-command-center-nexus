import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';
import { unifiedAuthService } from './UnifiedAuthService';

interface BootstrapData {
  email: string;
  password: string;
  fullName: string;
}

interface BootstrapStatus {
  isCompleted: boolean;
  hasAdminUsers: boolean;
  systemReady: boolean;
}

/**
 * Bootstrap Service
 * Handles system initialization and bootstrap checking
 */
export class BootstrapService extends BaseService {
  private static instance: BootstrapService;

  private constructor() {
    super();
  }

  public static getInstance(): BootstrapService {
    if (!BootstrapService.instance) {
      BootstrapService.instance = new BootstrapService();
    }
    return BootstrapService.instance;
  }

  /**
   * Check if system bootstrap is completed
   */
  async checkBootstrapStatus(): Promise<ServiceResult<BootstrapStatus>> {
    return this.executeOperation(async () => {
      console.log('BootstrapService: Checking bootstrap status...');

      // Check system config for bootstrap completion
      const isCompleted = await unifiedAuthService.isBootstrapCompleted();

      // Check if any admin users exist
      const { data: adminUsers, error: adminError } = await supabase
        .from('admin_users')
        .select('id, role, is_active')
        .eq('is_active', true)
        .limit(1);

      if (adminError) {
        console.warn('BootstrapService: Error checking admin users:', adminError);
      }

      const hasAdminUsers = adminUsers && adminUsers.length > 0;

      return {
        isCompleted,
        hasAdminUsers: Boolean(hasAdminUsers),
        systemReady: isCompleted && Boolean(hasAdminUsers)
      };
    }, 'checkBootstrapStatus');
  }

  /**
   * Complete bootstrap process
   */
  async completeBootstrap(bootstrapData: BootstrapData): Promise<ServiceResult<any>> {
    return this.executeOperation(async () => {
      console.log('BootstrapService: Starting bootstrap process...');

      // Validate input
      if (!bootstrapData.email?.trim()) {
        throw new Error('Email is required');
      }
      if (!bootstrapData.password) {
        throw new Error('Password is required');
      }
      if (!bootstrapData.fullName?.trim()) {
        throw new Error('Full name is required');
      }

      // Check if bootstrap is already completed
      const statusResult = await this.checkBootstrapStatus();
      if (statusResult.success && statusResult.data?.isCompleted) {
        throw new Error('System is already initialized');
      }

      // Use UnifiedAuthService to bootstrap super admin
      const result = await unifiedAuthService.bootstrapSuperAdmin(
        bootstrapData.email.trim(),
        bootstrapData.password,
        bootstrapData.fullName.trim()
      );

      if (!result.success) {
        throw new Error(result.error || 'Bootstrap failed');
      }

      console.log('BootstrapService: Bootstrap completed successfully');
      return result.data;
    }, 'completeBootstrap');
  }

  /**
   * Validate bootstrap data
   */
  validateBootstrapData(data: Partial<BootstrapData>): string[] {
    const errors: string[] = [];

    if (!data.email?.trim()) {
      errors.push('Email is required');
    } else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(data.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!data.fullName?.trim()) {
      errors.push('Full name is required');
    } else if (data.fullName.trim().length < 2) {
      errors.push('Full name must be at least 2 characters long');
    }

    if (!data.password) {
      errors.push('Password is required');
    } else if (data.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    return errors;
  }

  /**
   * Cleanup incomplete bootstrap state
   */
  async cleanupBootstrapState(): Promise<ServiceResult<void>> {
    return this.executeOperation(async () => {
      console.log('BootstrapService: Cleaning up bootstrap state...');

      // Call the cleanup function
      const { error } = await supabase.rpc('cleanup_bootstrap_state');

      if (error) {
        throw new Error(`Failed to cleanup bootstrap state: ${error.message}`);
      }

      console.log('BootstrapService: Bootstrap state cleaned up successfully');
    }, 'cleanupBootstrapState');
  }

  /**
   * Verify admin user setup
   */
  async verifyAdminUserSetup(): Promise<ServiceResult<any[]>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase.rpc('verify_admin_user_setup');

      if (error) {
        throw new Error(`Failed to verify admin setup: ${error.message}`);
      }

      return data || [];
    }, 'verifyAdminUserSetup');
  }
}

export const bootstrapService = BootstrapService.getInstance();