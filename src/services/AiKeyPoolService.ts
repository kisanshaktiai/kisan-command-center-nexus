// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007  (NEW FILE)
// PATH: src/services/AiKeyPoolService.ts
//
// CHANGE LOG
// 2026-10-03 — AI control plane Phase 2a (key pool): the super admin's view of the provider API keys
//   the farmer app's AI router rotates through — key slots (ai_key_slot: secret NAME only, never the
//   key), the model groups that share a daily complimentary-token pool (ai_model_group), today's and
//   recent usage per key (ai_key_usage_daily) and the live key check (edge function ai-registry-admin,
//   action key_status: is the secret set, does the provider accept it). Edits (enable/disable a key,
//   its daily pool, reserve, label, notes) go straight to ai_key_slot under the registry's RLS
//   (super admin only) and are audited by the registry's trigger. Needs migration
//   20261003100000_ai_key_pool.sql (farmer-app repo).
import { supabase } from '@/integrations/supabase/client';

export type AiProvider = 'openai' | 'gemini' | 'lovable';

export interface AiKeySlotRow {
  provider: AiProvider;
  slot_no: number;
  label: string;
  env_var: string;
  is_enabled: boolean;
  daily_pool: Record<string, number>;
  reserve_tokens: number;
  notes: string | null;
  change_reason: string;
  updated_at: string;
}

export interface AiModelGroupRow {
  group_key: string;
  provider: AiProvider;
  name: string;
  description: string;
  api_model_ids: string[];
  is_active: boolean;
  updated_at: string;
}

export interface AiKeyUsageDailyRow {
  day: string;
  provider: AiProvider;
  key_slot: number;
  group_key: string | null;
  pool: 'free' | 'paid' | 'none' | 'unknown';
  calls: number;
  ok_calls: number;
  failed_calls: number;
  limited_calls: number;
  input_tokens: number;
  output_tokens: number;
  tokens: number;
  cost_usd: number;
  last_call_at: string | null;
  last_error_at: string | null;
}

/** One key as the screen shows it: slot row + today's figures rolled up from ai_key_usage_daily. */
export interface AiKeySlotWithUsage extends AiKeySlotRow {
  today: {
    /** tokens used today per group (ok calls only — what the router counts against the pool) */
    usedByGroup: Record<string, number>;
    calls: number;
    okCalls: number;
    failedCalls: number;
    limitedCalls: number;
    freeCalls: number;
    paidCalls: number;
    costUsd: number;
    lastCallAt: string | null;
    lastErrorAt: string | null;
  };
}

export interface AiKeyStatus {
  provider: AiProvider;
  slot_no: number;
  env_var: string;
  configured: boolean;
  probe: { ok: boolean; http_status: number | null; detail: string } | null;
}

export interface AiKeyStatusResult {
  checked_at: string;
  keys: AiKeyStatus[];
}

export interface AiKeySlotUpdate {
  label?: string;
  is_enabled?: boolean;
  daily_pool?: Record<string, number>;
  reserve_tokens?: number;
  notes?: string | null;
  change_reason: string;
}

const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);

export class AiKeyPoolService {
  static async getSlots(): Promise<AiKeySlotWithUsage[]> {
    const today = utcDay();
    const [slotsRes, usageRes] = await Promise.all([
      supabase.from('ai_key_slot').select('*').order('provider').order('slot_no'),
      supabase.from('ai_key_usage_daily').select('*').eq('day', today),
    ]);
    if (slotsRes.error) throw slotsRes.error;
    if (usageRes.error) throw usageRes.error;

    const usage = (usageRes.data || []) as unknown as AiKeyUsageDailyRow[];
    return ((slotsRes.data || []) as unknown as AiKeySlotRow[]).map((s) => {
      const today = {
        usedByGroup: {} as Record<string, number>,
        calls: 0, okCalls: 0, failedCalls: 0, limitedCalls: 0, freeCalls: 0, paidCalls: 0, costUsd: 0,
        lastCallAt: null as string | null, lastErrorAt: null as string | null,
      };
      usage
        .filter((u) => u.provider === s.provider && u.key_slot === s.slot_no)
        .forEach((u) => {
          today.calls += u.calls;
          today.okCalls += u.ok_calls;
          today.failedCalls += u.failed_calls;
          today.limitedCalls += u.limited_calls;
          if (u.pool === 'free') today.freeCalls += u.ok_calls;
          if (u.pool === 'paid') today.paidCalls += u.ok_calls;
          today.costUsd += Number(u.cost_usd || 0);
          // The router counts input + output tokens of ok calls per group; the view sums tokens over all
          // rows of a (day, key, group, pool), failed rows carry no usage, so tokens == ok-call tokens.
          if (u.group_key) today.usedByGroup[u.group_key] = (today.usedByGroup[u.group_key] || 0) + Number(u.tokens || 0);
          if (u.last_call_at && (!today.lastCallAt || u.last_call_at > today.lastCallAt)) today.lastCallAt = u.last_call_at;
          if (u.last_error_at && (!today.lastErrorAt || u.last_error_at > today.lastErrorAt)) today.lastErrorAt = u.last_error_at;
        });
      return { ...s, daily_pool: (s.daily_pool || {}) as Record<string, number>, today };
    });
  }

  static async getGroups(): Promise<AiModelGroupRow[]> {
    const { data, error } = await supabase.from('ai_model_group').select('*').order('provider').order('group_key');
    if (error) throw error;
    return (data || []) as unknown as AiModelGroupRow[];
  }

  /** Per-day rows for the last `days` UTC days (today included), newest first. */
  static async getRecentUsage(days: number): Promise<AiKeyUsageDailyRow[]> {
    const since = utcDay(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));
    const { data, error } = await supabase
      .from('ai_key_usage_daily')
      .select('*')
      .gte('day', since)
      .order('day', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as AiKeyUsageDailyRow[];
  }

  static async updateSlot(provider: AiProvider, slotNo: number, patch: AiKeySlotUpdate): Promise<void> {
    if (!patch.change_reason || !patch.change_reason.trim()) throw new Error('A change reason is required.');
    const { error } = await supabase
      .from('ai_key_slot')
      .update(patch as never)
      .eq('provider', provider)
      .eq('slot_no', slotNo);
    if (error) throw error;
  }

  /** Live check through the admin edge function: secret present? provider accepts it? Never returns key material. */
  static async checkKeys(probe: boolean): Promise<AiKeyStatusResult> {
    const { data, error } = await supabase.functions.invoke('ai-registry-admin', { body: { action: 'key_status', probe } });
    if (error) throw error;
    if (!data || !Array.isArray(data.keys)) throw new Error('Unexpected response from ai-registry-admin');
    return data as AiKeyStatusResult;
  }
}
