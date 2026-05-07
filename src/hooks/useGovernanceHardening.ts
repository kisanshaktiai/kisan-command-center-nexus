import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MigrationDraft = {
  id: string;
  category: string;
  title: string;
  rationale: string | null;
  sql_draft: string;
  severity: "info" | "warn" | "critical";
  status: "pending" | "applied" | "dismissed";
  reviewer_notes: string | null;
  reviewed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CronJob = {
  id: string;
  job_name: string;
  schedule: string;
  description: string | null;
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  enabled: boolean;
};

export function useMigrationDrafts() {
  return useQuery({
    queryKey: ["governance-migration-drafts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_migration_drafts" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MigrationDraft[];
    },
  });
}

export function useCronJobs() {
  return useQuery({
    queryKey: ["governance-cron-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_cron_jobs" as any)
        .select("*")
        .order("job_name");
      if (error) throw error;
      return (data || []) as unknown as CronJob[];
    },
  });
}

export function useGenerateHardeningDrafts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "governance-hardening",
        { body: {} },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast.success(
        `Generated ${d?.new_drafts ?? 0} new draft(s) (${d?.generated ?? 0} evaluated)`,
      );
      qc.invalidateQueries({ queryKey: ["governance-migration-drafts"] });
      qc.invalidateQueries({ queryKey: ["governance-cron-jobs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to generate drafts"),
  });
}

export function useUpdateDraftStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: string;
      status: "applied" | "dismissed";
      notes?: string;
    }) => {
      const { error } = await supabase
        .from("governance_migration_drafts" as any)
        .update({
          status: vars.status,
          reviewer_notes: vars.notes ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Draft updated");
      qc.invalidateQueries({ queryKey: ["governance-migration-drafts"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });
}
