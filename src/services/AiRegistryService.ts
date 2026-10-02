// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007  (NEW FILE)
// PATH: src/services/AiRegistryService.ts
//
// CHANGE LOG
// 2026-10-01 — AI control plane Phase 1 (read-only): reads the AI model registry the super admin
//   owns — features (ai_feature), jobs (ai_task_route) with their ordered model chains
//   (ai_task_route_step), the model catalog (ai_model_catalog), active prices (ai_model_pricing)
//   and the change history (ai_registry_audit_log). Reads use the admin's own login; the registry's
//   row-level security already limits them to super admins. No writes here (Phase 2).
import { supabase } from '@/integrations/supabase/client';

export interface AiFeatureRow {
  feature_key: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  change_reason: string;
  updated_at: string;
}

export interface AiRouteStepRow {
  task_key: string;
  step_no: number;
  model_key: string;
}

export interface AiRouteRow {
  task_key: string;
  feature_key: string;
  description: string;
  required_modalities: string[];
  params: Record<string, unknown>;
  is_active: boolean;
  change_reason: string;
  updated_at: string;
  steps: AiRouteStepRow[];
}

export interface AiFeatureWithRoutes extends AiFeatureRow {
  routes: AiRouteRow[];
}

export interface AiModelContract {
  token_param: string;
  temperature: 'allowed' | 'omit';
  reasoning_efforts: string[];
}

export interface AiModelRow {
  model_key: string;
  provider: string;
  api_model_id: string;
  status: 'candidate' | 'active' | 'deprecated' | 'retired';
  input_modalities: string[];
  api_contract: AiModelContract;
  shutdown_date: string | null;
  replacement_model_key: string | null;
  source_url: string | null;
  notes: string | null;
  change_reason: string;
  updated_at: string;
}

export interface AiActivePriceRow {
  id: string;
  model_name: string;
  input_cost_per_1k: number;
  cached_input_cost_per_1k: number | null;
  output_cost_per_1k: number;
  currency: string;
  effective_from: string;
}

export interface AiModelWithUsage extends AiModelRow {
  price: AiActivePriceRow | null;
  /** task keys whose chain names this model, in route order */
  used_by: string[];
}

export interface AiAuditRow {
  id: string;
  table_name: string;
  row_key: string;
  action: 'insert' | 'update' | 'delete';
  changed_by: string | null;
  changed_by_email: string | null;
  change_reason: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export class AiRegistryService {
  /** Features in admin order, each with its jobs and their ordered model chains. */
  static async getFeaturesWithRoutes(): Promise<AiFeatureWithRoutes[]> {
    const [featRes, routeRes, stepRes] = await Promise.all([
      supabase.from('ai_feature').select('*').order('sort_order'),
      supabase.from('ai_task_route').select('*').order('task_key'),
      supabase.from('ai_task_route_step').select('task_key,step_no,model_key').order('task_key').order('step_no'),
    ]);
    if (featRes.error) throw featRes.error;
    if (routeRes.error) throw routeRes.error;
    if (stepRes.error) throw stepRes.error;

    const stepsByTask = new Map<string, AiRouteStepRow[]>();
    (stepRes.data || []).forEach((s) => {
      const list = stepsByTask.get(s.task_key) || [];
      list.push(s as AiRouteStepRow);
      stepsByTask.set(s.task_key, list);
    });

    const routesByFeature = new Map<string, AiRouteRow[]>();
    (routeRes.data || []).forEach((r: any) => {
      const route: AiRouteRow = {
        task_key: r.task_key,
        feature_key: r.feature_key,
        description: r.description,
        required_modalities: r.required_modalities || [],
        params: (r.params as Record<string, unknown>) || {},
        is_active: r.is_active,
        change_reason: r.change_reason,
        updated_at: r.updated_at,
        steps: stepsByTask.get(r.task_key) || [],
      };
      const list = routesByFeature.get(route.feature_key) || [];
      list.push(route);
      routesByFeature.set(route.feature_key, list);
    });

    return (featRes.data || []).map((f: any) => ({
      ...(f as AiFeatureRow),
      routes: routesByFeature.get(f.feature_key) || [],
    }));
  }

  /** Every catalog model with its active price row and the jobs that use it. */
  static async getModels(): Promise<AiModelWithUsage[]> {
    const [catRes, priceRes, stepRes] = await Promise.all([
      supabase.from('ai_model_catalog').select('*').order('provider').order('model_key'),
      supabase
        .from('ai_model_pricing')
        .select('id,model_name,input_cost_per_1k,cached_input_cost_per_1k,output_cost_per_1k,currency,effective_from')
        .eq('is_active', true)
        .order('effective_from', { ascending: false }),
      supabase.from('ai_task_route_step').select('task_key,step_no,model_key').order('task_key').order('step_no'),
    ]);
    if (catRes.error) throw catRes.error;
    if (priceRes.error) throw priceRes.error;
    if (stepRes.error) throw stepRes.error;

    // Newest active price per model (rows come newest-first).
    const priceByModel = new Map<string, AiActivePriceRow>();
    (priceRes.data || []).forEach((p: any) => {
      if (!priceByModel.has(p.model_name)) priceByModel.set(p.model_name, p as AiActivePriceRow);
    });

    const usedBy = new Map<string, string[]>();
    (stepRes.data || []).forEach((s: any) => {
      const list = usedBy.get(s.model_key) || [];
      if (!list.includes(s.task_key)) list.push(s.task_key);
      usedBy.set(s.model_key, list);
    });

    return (catRes.data || []).map((m: any) => ({
      ...(m as AiModelRow),
      api_contract: (m.api_contract as AiModelContract) || { token_param: '', temperature: 'allowed', reasoning_efforts: [] },
      price: priceByModel.get(m.model_key) || null,
      used_by: usedBy.get(m.model_key) || [],
    }));
  }

  /** Latest registry changes, newest first, with the admin's email when it can be resolved. */
  static async getChangeHistory(limit = 200): Promise<AiAuditRow[]> {
    const [logRes, adminRes] = await Promise.all([
      supabase
        .from('ai_registry_audit_log')
        .select('id,table_name,row_key,action,changed_by,change_reason,old_value,new_value,created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase.from('admin_users').select('id,email'),
    ]);
    if (logRes.error) throw logRes.error;
    // admin_users is best-effort for display only; a read error must not hide the history.
    const emailById = new Map<string, string>();
    (adminRes.data || []).forEach((a: any) => emailById.set(a.id, a.email));

    return (logRes.data || []).map((row: any) => ({
      ...(row as Omit<AiAuditRow, 'changed_by_email'>),
      changed_by_email: row.changed_by ? emailById.get(row.changed_by) || null : null,
    }));
  }
}
