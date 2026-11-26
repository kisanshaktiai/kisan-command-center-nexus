// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007  (NEW FILE)
// PATH: src/services/ActivationCodeService.ts
//
// CHANGE LOG
// 2026-11-25 — Farmer activation codes: thin client over the activation_* database functions
//   (migrations farmer_activation_core and farmer_activation_licence_lock in the farmer-app repo).
// 2026-11-25 (2) — Per-batch counts now read every code of the tenant page by page. The API returns
//   at most 1000 rows per request, so a tenant with more than 1000 codes showed wrong counts.
//   The Codes list is capped at CODES_LIST_LIMIT rows and says so (exported for the page).
import { supabase } from '@/integrations/supabase/client';

/**
 * Farmer activation codes — SaaS admin side.
 *
 * Every privileged step is a database function that checks the caller's own
 * login (auth.uid() must be a super admin). This service only passes
 * arguments through and shapes results; nothing here decides who may do what.
 * Plain codes exist in the browser only inside the download call that asked
 * for them: they are never stored, cached or logged by this service.
 */

export type ActivationState = 'GENERATED' | 'AVAILABLE' | 'ACTIVATED' | 'EXPIRED' | 'REVOKED';
export type SubscriptionInterval = 'biannual' | 'annually';

export interface ActivationTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface FarmerPlan {
  id: string;
  name: string;
  tenant_id: string | null;
}

export interface ActivationUsage {
  tenant_id: string;
  tenant_status: string;
  subscription: { status: string | null; period_end: string | null; active: boolean };
  seat_limit: number | null;
  seats_used: number;
  seats_remaining: number;
  capacity_exhausted: boolean;
  codes: { available: number; activated: number; revoked: number; expired: number; generated?: number };
  enforced: boolean;
  /** Licences not yet used by a farmer or tied up in an unused code. Super admin only. */
  can_still_issue?: number;
}

export interface ActivationBatch {
  id: string;
  tenant_id: string;
  batch_label: string | null;
  code_count: number;
  expires_at: string;
  subscription_interval: SubscriptionInterval;
  farmer_plan_id: string;
  created_by: string;
  created_at: string;
  released_at: string | null;
  released_by: string | null;
}

/** The columns a signed-in user may read; the hash and the encrypted copy are not among them. */
export interface ActivationCodeRow {
  id: string;
  tenant_id: string;
  batch_id: string | null;
  code_hint: string | null;
  state: ActivationState;
  expires_at: string | null;
  created_at: string | null;
  released_at: string | null;
  redeemed_by: string | null;
  redeemed_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  expired_at: string | null;
}

export interface BatchStateCounts {
  batch_id: string;
  generated: number;
  available: number;
  activated: number;
  expired: number;
  revoked: number;
}

export interface ActivationLogRow {
  id: string;
  event: string;
  success: boolean | null;
  result_code: string | null;
  activation_code_id: string | null;
  tenant_id: string | null;
  farmer_id: string | null;
  actor_id: string | null;
  batch_id: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface GenerateBatchInput {
  tenantId: string;
  count: number;
  expiresAt: Date;
  interval: SubscriptionInterval;
  farmerPlanId: string;
  label?: string;
}

export interface GenerateBatchResult {
  batch_id: string;
  tenant_id: string;
  code_count: number;
  state: 'GENERATED';
  expires_at: string;
  seat_limit: number | null;
  seats_used: number;
  unused_codes: number;
  can_still_issue: number;
}

export interface SetEntitlementInput {
  tenantId: string;
  licences: number;
  validUntil: Date;
  reason: string;
}

/** One plain code, alive only while a sheet is being built. */
export interface RevealedCode {
  code_id: string;
  code: string;
  qr_payload: string;
  state: ActivationState;
  expires_at: string;
}

// The generated Supabase types predate the activation migrations (no state, batch_id or event
// columns yet), so the activation tables are addressed untyped below and results are cast.
const CODE_COLUMNS =
  'id, tenant_id, batch_id, code_hint, state, expires_at, created_at, released_at, redeemed_by, redeemed_at, revoked_at, revoke_reason, expired_at';

const API_PAGE = 1000;      // the API returns at most this many rows per request
const MAX_SCAN = 200_000;   // upper bound for the whole-tenant scan below
/** The Codes tab lists at most this many rows; narrow by batch or state to see others. */
export const CODES_LIST_LIMIT = 1000;

export class ActivationCodeService {
  static async getTenants(): Promise<ActivationTenant[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, slug, status')
      .in('status', ['active', 'trial'])
      .is('deleted_at', null)
      .order('name');
    if (error) throw error;
    return (data || []) as ActivationTenant[];
  }

  /** Farmer plans a batch may carry: global ones and the tenant's own. */
  static async getFarmerPlans(tenantId: string): Promise<FarmerPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('id, name, tenant_id')
      .eq('plan_category', 'farmer')
      .eq('is_active', true)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .order('name');
    if (error) throw error;
    return (data || []) as FarmerPlan[];
  }

  static async getUsage(tenantId: string): Promise<ActivationUsage> {
    const { data, error } = await supabase.rpc('activation_usage' as never, { p_tenant_id: tenantId } as never);
    if (error) throw error;
    return data as unknown as ActivationUsage;
  }

  static async getBatches(tenantId: string): Promise<ActivationBatch[]> {
    const { data, error } = await supabase
      .from('activation_code_batches' as never)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as ActivationBatch[];
  }

  static async getBatchStateCounts(tenantId: string): Promise<Record<string, BatchStateCounts>> {
    const out: Record<string, BatchStateCounts> = {};
    for (let from = 0; from < MAX_SCAN; from += API_PAGE) {
      const { data, error } = await supabase
        .from('activation_codes' as never)
        .select('batch_id, state')
        .eq('tenant_id', tenantId)
        .order('id')
        .range(from, from + API_PAGE - 1);
      if (error) throw error;
      const rows = (data || []) as unknown as Array<{ batch_id: string | null; state: ActivationState }>;
      for (const row of rows) {
        if (!row.batch_id) continue;
        const c = (out[row.batch_id] ??= {
          batch_id: row.batch_id, generated: 0, available: 0, activated: 0, expired: 0, revoked: 0,
        });
        switch (row.state) {
          case 'GENERATED': c.generated++; break;
          case 'AVAILABLE': c.available++; break;
          case 'ACTIVATED': c.activated++; break;
          case 'EXPIRED': c.expired++; break;
          case 'REVOKED': c.revoked++; break;
        }
      }
      if (rows.length < API_PAGE) break;
    }
    return out;
  }

  static async getCodes(tenantId: string, batchId?: string | null, state?: ActivationState | null): Promise<ActivationCodeRow[]> {
    let q = supabase
      .from('activation_codes' as never)
      .select(CODE_COLUMNS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(CODES_LIST_LIMIT);
    if (batchId) q = q.eq('batch_id' as never, batchId as never);
    if (state) q = q.eq('state' as never, state as never);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as unknown as ActivationCodeRow[];
  }

  static async getHistory(tenantId: string, limit = 200): Promise<ActivationLogRow[]> {
    const { data, error } = await supabase
      .from('activation_logs' as never)
      .select('id, event, success, result_code, activation_code_id, tenant_id, farmer_id, actor_id, batch_id, ip_address, metadata, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as unknown as ActivationLogRow[];
  }

  /** Records what the tenant bought: licence count and validity. Audited in the database. */
  static async setEntitlement(input: SetEntitlementInput): Promise<void> {
    const { error } = await supabase.rpc('activation_admin_set_entitlement' as never, {
      p_tenant_id: input.tenantId,
      p_licences: input.licences,
      p_valid_until: input.validUntil.toISOString(),
      p_reason: input.reason,
    } as never);
    if (error) throw error;
  }

  static async generateBatch(input: GenerateBatchInput): Promise<GenerateBatchResult> {
    const { data, error } = await supabase.rpc('activation_admin_generate_batch' as never, {
      p_tenant_id: input.tenantId,
      p_count: input.count,
      p_expires_at: input.expiresAt.toISOString(),
      p_subscription_interval: input.interval,
      p_farmer_plan_id: input.farmerPlanId,
      p_label: input.label?.trim() || null,
    } as never);
    if (error) throw error;
    return data as unknown as GenerateBatchResult;
  }

  static async releaseBatch(batchId: string): Promise<{ batch_id: string; released: number }> {
    const { data, error } = await supabase.rpc('activation_admin_release_batch' as never, { p_batch_id: batchId } as never);
    if (error) throw error;
    return data as unknown as { batch_id: string; released: number };
  }

  static async revoke(args: { batchId?: string | null; codeIds?: string[] | null; reason: string }): Promise<number> {
    const { data, error } = await supabase.rpc('activation_admin_revoke' as never, {
      p_batch_id: args.batchId ?? null,
      p_code_ids: args.codeIds && args.codeIds.length > 0 ? args.codeIds : null,
      p_reason: args.reason,
    } as never);
    if (error) throw error;
    return Number((data as unknown as { revoked: number })?.revoked ?? 0);
  }

  /**
   * Plain codes of one batch for a printable sheet. The database logs every
   * call with the caller's id (CODES_REVEALED). Callers must drop the result
   * as soon as the sheet is built.
   */
  static async revealCodes(batchId: string): Promise<RevealedCode[]> {
    const { data, error } = await supabase.rpc('activation_reveal_codes' as never, { p_batch_id: batchId } as never);
    if (error) throw error;
    return (data || []) as unknown as RevealedCode[];
  }
}

/** Turns a database error into the short error key the UI can translate. */
export function activationErrorKey(err: unknown): string {
  const message = String((err as { message?: string })?.message ?? err ?? '');
  const known = [
    'not_authorized', 'invalid_count', 'invalid_expiry', 'invalid_interval', 'tenant_not_eligible',
    'invalid_farmer_plan', 'batch_not_found', 'nothing_to_revoke', 'reason_required',
    'exceeds_licences', 'subscription_inactive', 'licences_below_used', 'invalid_licences',
    'invalid_valid_until', 'licence_locked',
  ];
  return known.find((k) => message.includes(k)) ?? 'unknown';
}
