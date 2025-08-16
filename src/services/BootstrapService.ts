
import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';
import { authenticationService } from './AuthenticationService';

interface BootstrapData {
  email: string;
  password: string;
  fullName: string;
}

interface BootstrapStatus {
  isCompleted: boolean;
  hasAdminUsers: boolean;
  systemReady: boolean;
  isConsistent: boolean;
  details?: any;
}

interface BootstrapStatusResponse {
  completed: boolean;
  needs_bootstrap: boolean;
  super_admin_count: number;
  config_completed: boolean;
  status: string;
}

/**
 * Bootstrap Service - Enhanced with new database functions
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
   * Comprehensive bootstrap status check using new database function
   */
  async checkBootstrapStatus(): Promise<ServiceResult<BootstrapStatus>> {
    return this.executeOperation(async () => {
      console.log('BootstrapService: Starting comprehensive bootstrap status check...');

      // Use the new database function for consistent checking
      const { data, error } = await supabase.rpc('get_bootstrap_status');

      if (error) {
        console.error('BootstrapService: Error checking bootstrap status:', error);
        throw new Error(`Failed to check bootstrap status: ${error.message}`);
      }

      console.log('BootstrapService: Bootstrap status from database:', data);

      // Safe type assertion through unknown
      const response = data as unknown as BootstrapStatusResponse;
      const isCompleted = response?.completed === true;
      const hasAdminUsers = (response?.super_admin_count || 0) > 0;
      const systemReady = isCompleted && hasAdminUsers;
      const isConsistent = true; // The database function handles consistency

      console.log('BootstrapService: Processed status:', {
        isCompleted,
        hasAdminUsers,
        systemReady,
        isConsistent
      });

      return {
        isCompleted,
        hasAdminUsers,
        systemReady,
        isConsistent,
        details: response
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
      const isCompleted = await authenticationService.isBootstrapCompleted();
      if (isCompleted) {
        throw new Error('System is already initialized');
      }

      // Use AuthenticationService to bootstrap super admin
      const result = await authenticationService.bootstrapSuperAdmin(
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
    } else {
      // Enhanced password validation
      const passwordValidation = this.validatePasswordStrength(data.password);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }

    return errors;
  }

  /**
   * Enhanced password validation
   */
  private validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password should contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Fix inconsistent bootstrap state using new database function
   */
  async fixInconsistentState(): Promise<ServiceResult<void>> {
    return this.executeOperation(async () => {
      console.log('BootstrapService: Fixing inconsistent bootstrap state...');

      const { data, error } = await supabase.rpc('complete_bootstrap_safely');

      if (error) {
        throw new Error(`Failed to fix bootstrap state: ${error.message}`);
      }

      console.log('BootstrapService: Bootstrap state fixed:', data);
    }, 'fixInconsistentState');
  }

  /**
   * Get detailed bootstrap information
   */
  async getBootstrapInfo(): Promise<ServiceResult<any>> {
    return this.executeOperation(async () => {
      const { data, error } = await supabase.rpc('get_bootstrap_status');

      if (error) {
        throw new Error(`Failed to get bootstrap info: ${error.message}`);
      }

      return data;
    }, 'getBootstrapInfo');
  }
}

export const bootstrapService = BootstrapService.getInstance();
