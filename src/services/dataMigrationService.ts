
import { supabase } from '@/integrations/supabase/client';
import { FarmersService } from './farmersService';
import type { ParsedFarmerData } from '@/utils/csvParser';

export interface MigrationJob {
  id: string;
  tenant_id: string;
  migration_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_records: number;
  processed_records: number;
  failed_records: number;
  progress_data: Record<string, any>;
  error_log: Array<{ error: string; details?: any }>;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export class DataMigrationService {
  static async createMigrationJob(
    tenantId: string,
    migrationType: string,
    totalRecords: number,
    sourceConfig?: Record<string, any>
  ): Promise<string> {
    const { data, error } = await supabase
      .from('data_migration_jobs')
      .insert({
        tenant_id: tenantId,
        migration_type: migrationType,
        status: 'pending',
        total_records: totalRecords,
        processed_records: 0,
        failed_records: 0,
        progress_data: {},
        source_config: sourceConfig || {},
        error_log: []
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating migration job:', error);
      throw error;
    }

    return data.id;
  }

  static async updateMigrationJob(
    jobId: string,
    updates: Partial<MigrationJob>
  ): Promise<void> {
    const { error } = await supabase
      .from('data_migration_jobs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error updating migration job:', error);
      throw error;
    }
  }

  static async startMigrationJob(jobId: string): Promise<void> {
    await this.updateMigrationJob(jobId, {
      status: 'running',
      started_at: new Date().toISOString()
    });
  }

  static async completeMigrationJob(
    jobId: string,
    processedRecords: number,
    failedRecords: number,
    errorLog: Array<{ error: string; details?: any }> = []
  ): Promise<void> {
    await this.updateMigrationJob(jobId, {
      status: processedRecords > 0 ? 'completed' : 'failed',
      processed_records: processedRecords,
      failed_records: failedRecords,
      error_log: errorLog,
      completed_at: new Date().toISOString()
    });
  }

  static async importFarmersWithProgress(
    farmers: ParsedFarmerData[],
    tenantId: string,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; imported: number; errors: any[] }> {
    // Create migration job
    const jobId = await this.createMigrationJob(
      tenantId,
      'farmers_csv_import',
      farmers.length,
      { source: 'csv', format: 'farmers' }
    );

    try {
      // Start the job
      await this.startMigrationJob(jobId);

      // Import farmers with progress tracking
      const result = await FarmersService.importFarmers(
        farmers,
        tenantId,
        async (progress) => {
          // Update job progress
          await this.updateMigrationJob(jobId, {
            progress_data: { percentage: progress }
          });
          
          // Call external progress callback
          onProgress?.(progress);
        }
      );

      // Complete the job
      await this.completeMigrationJob(
        jobId,
        result.imported,
        result.errors.length,
        result.errors.map(err => ({
          error: err.error,
          details: { farmer_name: err.farmer.name }
        }))
      );

      return {
        success: result.success,
        imported: result.imported,
        errors: result.errors
      };
    } catch (error) {
      // Mark job as failed
      await this.completeMigrationJob(jobId, 0, farmers.length, [
        { error: error.message, details: { type: 'system_error' } }
      ]);
      
      throw error;
    }
  }

  static async getMigrationJobs(
    tenantId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: MigrationJob[]; count: number; totalPages: number }> {
    const { data, error, count } = await supabase
      .from('data_migration_jobs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Error fetching migration jobs:', error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  static async getMigrationJob(jobId: string): Promise<MigrationJob | null> {
    const { data, error } = await supabase
      .from('data_migration_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching migration job:', error);
      throw error;
    }

    return data;
  }

  static async deleteMigrationJob(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('data_migration_jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      console.error('Error deleting migration job:', error);
      throw error;
    }
  }
}
