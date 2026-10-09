import { supabase } from '@/integrations/supabase/client';

export interface BackupEvent {
  id: string;
  kind: 'daily_pitr' | 'manual_snapshot' | 'restore' | 'export';
  status: 'running' | 'succeeded' | 'failed';
  size_bytes: number | null;
  started_at: string;
  finished_at: string | null;
  triggered_by: string | null;
  notes: string | null;
}

// `backup_events` is not present in the generated Supabase types yet,
// so use an untyped client reference for these queries.
const db = supabase as any;

export class BackupService {
  static async list(limit = 50): Promise<BackupEvent[]> {
    const { data, error } = await db
      .from('backup_events')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as BackupEvent[];
  }

  static async lastSuccessful(): Promise<BackupEvent | null> {
    const { data, error } = await db
      .from('backup_events')
      .select('*')
      .eq('status', 'succeeded')
      .order('started_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (data?.[0] as BackupEvent) || null;
  }
}
