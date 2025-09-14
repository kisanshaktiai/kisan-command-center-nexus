
import { BaseService, ServiceResult } from '@/services/BaseService';
import { supabase } from '@/integrations/supabase/client';

export abstract class BaseTenantRepository extends BaseService {
  protected tableName: string;

  constructor(tableName: string) {
    super();
    this.tableName = tableName;
  }

  protected async executeQuery<T>(queryFn: () => any): Promise<ServiceResult<T>> {
    return this.executeOperation(async () => {
      const { data, error } = await queryFn();
      if (error) throw error;
      return data;
    }, `${this.constructor.name}.executeQuery`);
  }

  protected buildSelectQuery(columns: string = '*') {
    return supabase.from(this.tableName as any).select(columns);
  }

  protected buildInsertQuery(data: any) {
    return supabase.from(this.tableName as any).insert(data).select();
  }

  protected buildUpdateQuery(id: string, data: any) {
    return supabase.from(this.tableName as any).update(data).eq('id', id).select();
  }

  protected buildDeleteQuery(id: string) {
    return supabase.from(this.tableName as any).delete().eq('id', id);
  }
}
