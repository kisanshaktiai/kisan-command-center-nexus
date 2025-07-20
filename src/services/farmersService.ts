
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { ParsedFarmerData } from '@/utils/csvParser';

export interface FarmerImportResult {
  success: boolean;
  imported: number;
  errors: Array<{
    farmer: ParsedFarmerData;
    error: string;
  }>;
}

export class FarmersService {
  static async importFarmers(
    farmers: ParsedFarmerData[],
    tenantId: string,
    onProgress?: (progress: number) => void
  ): Promise<FarmerImportResult> {
    const result: FarmerImportResult = {
      success: false,
      imported: 0,
      errors: []
    };

    try {
      console.log('Starting farmer import:', { count: farmers.length, tenantId });
      
      // Check for existing farmers to avoid duplicates
      const existingFarmers = await this.checkExistingFarmers(farmers, tenantId);
      console.log('Existing farmers check complete:', existingFarmers.length);
      
      // Filter out existing farmers
      const newFarmers = farmers.filter(farmer => 
        !existingFarmers.some(existing => 
          (farmer.mobile_number && existing.mobile_number === farmer.mobile_number) ||
          (farmer.email && existing.email === farmer.email) ||
          (farmer.aadhaar_number && existing.aadhaar_number === farmer.aadhaar_number)
        )
      );

      console.log('New farmers to import:', newFarmers.length);
      
      if (newFarmers.length === 0) {
        toast({
          title: "No New Farmers",
          description: "All farmers in the file already exist in the database",
          variant: "destructive"
        });
        return result;
      }

      // Import farmers in batches
      const batchSize = 50;
      const batches = this.createBatches(newFarmers, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length}`);
        
        try {
          const { data, error } = await supabase
            .from('farmers')
            .insert(batch.map(farmer => ({
              ...farmer,
              tenant_id: tenantId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })))
            .select();

          if (error) {
            console.error('Batch import error:', error);
            // Add all farmers in this batch to errors
            batch.forEach(farmer => {
              result.errors.push({
                farmer,
                error: error.message
              });
            });
          } else {
            result.imported += batch.length;
            console.log(`Batch ${i + 1} imported successfully:`, batch.length);
          }
        } catch (batchError) {
          console.error('Batch processing error:', batchError);
          batch.forEach(farmer => {
            result.errors.push({
              farmer,
              error: batchError.message
            });
          });
        }

        // Update progress
        const progress = Math.round(((i + 1) / batches.length) * 100);
        onProgress?.(progress);
      }

      result.success = result.imported > 0;
      
      console.log('Import complete:', {
        imported: result.imported,
        errors: result.errors.length,
        success: result.success
      });

      return result;
    } catch (error) {
      console.error('Farmer import error:', error);
      
      farmers.forEach(farmer => {
        result.errors.push({
          farmer,
          error: error.message
        });
      });

      return result;
    }
  }

  private static async checkExistingFarmers(
    farmers: ParsedFarmerData[], 
    tenantId: string
  ): Promise<any[]> {
    const mobileNumbers = farmers
      .map(f => f.mobile_number)
      .filter(Boolean);
    
    const emails = farmers
      .map(f => f.email)
      .filter(Boolean);
    
    const aadhaarNumbers = farmers
      .map(f => f.aadhaar_number)
      .filter(Boolean);

    if (mobileNumbers.length === 0 && emails.length === 0 && aadhaarNumbers.length === 0) {
      return [];
    }

    // Build the OR condition as a single string
    const conditions = [];
    if (mobileNumbers.length > 0) {
      conditions.push(`mobile_number.in.(${mobileNumbers.join(',')})`);
    }
    if (emails.length > 0) {
      conditions.push(`email.in.(${emails.join(',')})`);
    }
    if (aadhaarNumbers.length > 0) {
      conditions.push(`aadhaar_number.in.(${aadhaarNumbers.join(',')})`);
    }

    const { data, error } = await supabase
      .from('farmers')
      .select('mobile_number, email, aadhaar_number')
      .eq('tenant_id', tenantId)
      .or(conditions.join(','));

    if (error) {
      console.error('Error checking existing farmers:', error);
      return [];
    }

    return data || [];
  }

  private static createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  static async getFarmersCount(tenantId: string): Promise<number> {
    const { count, error } = await supabase
      .from('farmers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error getting farmers count:', error);
      return 0;
    }

    return count || 0;
  }

  static async getFarmers(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    search?: string
  ) {
    let query = supabase
      .from('farmers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,mobile_number.ilike.%${search}%,village.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .select('*', { count: 'exact' });

    if (error) {
      console.error('Error fetching farmers:', error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }
}
