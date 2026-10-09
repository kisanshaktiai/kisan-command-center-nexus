// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007
// PATH: src/services/AiRegistryService.ts
//
// CHANGE LOG
// 2026-10-04 — AI control plane Phase 2b (admin writes): the super admin can now add a model, change
//   a model's lifecycle status and settings, set a price, create a job, change a job's settings and
//   replace a job's model chain. Writes go straight to the registry tables under their own row-level
//   security (super admin only) and every one is audited by the registry's trigger, which is why
//   change_reason is mandatory on each call rather than optional.
//   NOTHING IS EVER DELETED. The registry's ai_registry_prevent_delete trigger blocks DELETE on
//   ai_model_catalog and ai_task_route, the DELETE grant is revoked for authenticated, and
//   ai_model_metrics.model_name is a foreign key to ai_model_catalog(model_key) ON DELETE RESTRICT —
//   so a model that has answered even one call can never be removed without destroying its usage and
//   cost history. "Removing" a model is status = 'retired'; "removing" a job is is_active = false.
//   Model identity (model_key, provider, api_model_id) is immutable after insert — the catalog's
//   BEFORE UPDATE guard rejects a change, so a renamed model is a NEW row and the old one is retired.
//   replaceRouteSteps calls the database function ai_route_set_steps, so a chain is swapped inside one
//   transaction: a delete-then-insert from the browser could leave an active job with no model if the
//   second call failed, and the farmer would silently fall back to template text.
// 2026-10-01 — AI control plane Phase 1 (read-only): reads the AI model registry the super admin
//   owns — features (ai_feature), jobs (ai_task_route) with their ordered model chains
//   (ai_task_route_step), the model catalog (ai_model_catalog), active prices (ai_model_pricing)
//   and the change history (ai_registry_audit_log). Reads use the admin's own login; the registry's
//   row-level security already limits them to super admins.
import { supabase } from '@/integrations/supabase/client';
import { aiModelKey } from '@/lib/aiRegistryValidation';

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
  /** Free tier first (migration 20261004150000). Missing on an older schema ⇒ treated as true. */
  prefer_free_pool: boolean;
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

// ── write payloads ───────────────────────────────────────────────────────────

export interface AiModelCreate {
  provider: string;
  api_model_id: string;
  status: AiModelRow['status'];
  input_modalities: string[];
  api_contract: AiModelContract;
  shutdown_date?: string | null;
  replacement_model_key?: string | null;
  source_url?: string | null;
  notes?: string | null;
  change_reason: string;
}

/** Identity (model_key / provider / api_model_id) is deliberately absent — the catalog guard rejects it. */
export interface AiModelUpdate {
  status?: AiModelRow['status'];
  input_modalities?: string[];
  api_contract?: AiModelContract;
  shutdown_date?: string | null;
  replacement_model_key?: string | null;
  source_url?: string | null;
  notes?: string | null;
  change_reason: string;
}

export interface AiPriceCreate {
  model_name: string;
  input_cost_per_1k: number;
  cached_input_cost_per_1k: number | null;
  output_cost_per_1k: number;
  effective_from: string;
  source_url?: string | null;
  notes?: string | null;
}

export interface AiRouteCreate {
  task_key: string;
  feature_key: string;
  description: string;
  required_modalities: string[];
  params: Record<string, unknown>;
  is_active: boolean;
  prefer_free_pool: boolean;
  change_reason: string;
}

/** task_key is absent — the route guard rejects renaming a job (create a new one instead). */
export interface AiRouteUpdate {
  description?: string;
  required_modalities?: string[];
  params?: Record<string, unknown>;
  is_active?: boolean;
  prefer_free_pool?: boolean;
  change_reason: string;
}

const requireReason = (reason: string | undefined) => {
  if (!reason || !reason.trim()) throw new Error('A change reason is required — it is written to the audit log.');
  return reason.trim();
};

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
        // Older schema has no column; the router's own default is "prefer the free pool".
        prefer_free_pool: r.prefer_free_pool !== false,
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

  /** The distinct providers the catalog already holds — the picker's options, never a hardcoded list. */
  static async getProviders(): Promise<string[]> {
    const { data, error } = await supabase.from('ai_model_catalog').select('provider').order('provider');
    if (error) throw error;
    return Array.from(new Set((data || []).map((r: any) => String(r.provider))));
  }

  // ── writes ─────────────────────────────────────────────────────────────────

  /**
   * Adds a model to the catalog. model_key is derived as provider:api_model_id to satisfy the
   * `ai_model_catalog_key_format` constraint — the admin never types it.
   * A brand-new model is normally added as `candidate` and promoted to `active` once it has been
   * tried, because the route guard refuses to put a candidate in a chain.
   */
  static async createModel(input: AiModelCreate): Promise<string> {
    const reason = requireReason(input.change_reason);
    const model_key = aiModelKey(input.provider, input.api_model_id);
    const row = {
      model_key,
      provider: input.provider.trim(),
      api_model_id: input.api_model_id.trim(),
      status: input.status,
      input_modalities: input.input_modalities,
      api_contract: input.api_contract,
      shutdown_date: input.shutdown_date ?? null,
      replacement_model_key: input.replacement_model_key || null,
      source_url: input.source_url?.trim() || null,
      notes: input.notes?.trim() || null,
      change_reason: reason,
    };
    const { error } = await supabase.from('ai_model_catalog').insert(row as never);
    if (error) throw error;
    return model_key;
  }

  /** Changes a model's settings or lifecycle status. Identity columns cannot be changed. */
  static async updateModel(modelKey: string, patch: AiModelUpdate): Promise<void> {
    const reason = requireReason(patch.change_reason);
    const { error } = await supabase
      .from('ai_model_catalog')
      .update({ ...patch, change_reason: reason } as never)
      .eq('model_key', modelKey);
    if (error) throw error;
  }

  /**
   * Adds a price for a model, effective from a date. Prices are never edited in place — a new
   * effective_from row is the provider's new price list, and the old row stays for the cost history
   * already computed from it. Re-saving the same date replaces that date's row.
   */
  static async upsertPricing(input: AiPriceCreate): Promise<void> {
    const row = {
      model_name: input.model_name,
      input_cost_per_1k: input.input_cost_per_1k,
      cached_input_cost_per_1k: input.cached_input_cost_per_1k,
      output_cost_per_1k: input.output_cost_per_1k,
      currency: 'USD',
      effective_from: input.effective_from,
      is_active: true,
      source_url: input.source_url?.trim() || null,
      notes: input.notes?.trim() || null,
    };
    const { error } = await supabase
      .from('ai_model_pricing')
      .upsert(row as never, { onConflict: 'model_name,effective_from' });
    if (error) throw error;
  }

  /** Creates a job. Its chain is set separately with replaceRouteSteps. */
  static async createRoute(input: AiRouteCreate): Promise<void> {
    const reason = requireReason(input.change_reason);
    const row = {
      task_key: input.task_key.trim(),
      feature_key: input.feature_key,
      description: input.description.trim(),
      required_modalities: input.required_modalities,
      params: input.params,
      is_active: input.is_active,
      prefer_free_pool: input.prefer_free_pool,
      change_reason: reason,
    };
    const { error } = await supabase.from('ai_task_route').insert(row as never);
    if (error) throw error;
  }

  /** Changes a job's settings. task_key cannot be changed — create a new job instead. */
  static async updateRoute(taskKey: string, patch: AiRouteUpdate): Promise<void> {
    const reason = requireReason(patch.change_reason);
    const { error } = await supabase
      .from('ai_task_route')
      .update({ ...patch, change_reason: reason } as never)
      .eq('task_key', taskKey);
    if (error) throw error;
  }

  /**
   * Replaces a job's whole model chain in one transaction, through the database function
   * ai_route_set_steps(p_task_key, p_model_keys, p_change_reason). step_no comes from the position in
   * `modelKeys`, so the first entry is the primary model and the rest are its fallbacks in order.
   * Passing an empty list clears the chain, which the function refuses while the job is active.
   */
  static async replaceRouteSteps(taskKey: string, modelKeys: string[], changeReason: string): Promise<void> {
    const reason = requireReason(changeReason);
    const { error } = await supabase.rpc('ai_route_set_steps' as never, {
      p_task_key: taskKey,
      p_model_keys: modelKeys,
      p_change_reason: reason,
    } as never);
    if (error) throw error;
  }
}
