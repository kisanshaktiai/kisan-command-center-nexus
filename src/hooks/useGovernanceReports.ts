import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GovernanceReport {
  id: string;
  report_type: string;
  severity: 'info' | 'warn' | 'critical' | string;
  title: string;
  summary: string | null;
  total_issues: number;
  metrics: Record<string, unknown>;
  findings: unknown[];
  generated_at: string;
}

export function useGovernanceReports() {
  return useQuery({
    queryKey: ['governance-reports'],
    queryFn: async (): Promise<GovernanceReport[]> => {
      const { data, error } = await supabase
        .from('governance_audit_reports' as any)
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as GovernanceReport[];
    },
  });
}

export function useRunGovernanceAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('governance-audit', {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governance-reports'] });
    },
  });
}
