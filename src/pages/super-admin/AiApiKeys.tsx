// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007  (NEW FILE)
// PATH: src/pages/super-admin/AiApiKeys.tsx
//
// CHANGE LOG
// 2026-10-03 — AI control plane Phase 2a (key pool): one card per provider API key the farmer app's
//   AI router can use (ai_key_slot). Shows whether the key is enabled, whether its secret is set and
//   accepted by the provider (live check via ai-registry-admin), today's complimentary-pool use per
//   model group against the pool the admin set, calls (free / paid / failed / rate-limited), cost and
//   the last error. The admin edits label, enabled flag, daily pool per group, reserve and notes with a
//   mandatory change reason (audited). Pools are counted per UTC day (reset 00:00 UTC = 05:30 IST).
//   The key itself is never shown or stored — only the name of the Supabase secret that holds it.
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAiKeyRecentUsage, useAiKeySlots, useAiModelGroups, useCheckAiKeys, useUpdateAiKeySlot } from '@/hooks/useAiKeyPool';
import type { AiKeySlotWithUsage, AiKeyStatus, AiModelGroupRow } from '@/services/AiKeyPoolService';

const fmtTokens = (n: number) => n.toLocaleString('en-US');
const fmtUsd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });
const fmtTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

/** OpenAI complimentary-token pools per organisation and UTC day (help article, fetched 2026-10-02). */
const OPENAI_TIER_DEFAULTS: Record<'tier1_2' | 'tier3_5', Record<string, number>> = {
  tier1_2: { openai_big: 250_000, openai_mini: 2_500_000 },
  tier3_5: { openai_big: 1_000_000, openai_mini: 10_000_000 },
};

interface EditState {
  slot: AiKeySlotWithUsage;
  label: string;
  is_enabled: boolean;
  daily_pool: Record<string, string>;
  reserve_tokens: string;
  notes: string;
  change_reason: string;
}

export default function AiApiKeys() {
  const { t } = useTranslation('admin');
  const slotsQ = useAiKeySlots();
  const groupsQ = useAiModelGroups();
  const recentQ = useAiKeyRecentUsage(7);
  const update = useUpdateAiKeySlot();
  const check = useCheckAiKeys();
  const [edit, setEdit] = useState<EditState | null>(null);

  const groupsByProvider = useMemo(() => {
    const m = new Map<string, AiModelGroupRow[]>();
    (groupsQ.data || []).forEach((g) => m.set(g.provider, [...(m.get(g.provider) || []), g]));
    return m;
  }, [groupsQ.data]);

  const statusByKey = useMemo(() => {
    const m = new Map<string, AiKeyStatus>();
    (check.data?.keys || []).forEach((k) => m.set(`${k.provider}#${k.slot_no}`, k));
    return m;
  }, [check.data]);

  const openEdit = (slot: AiKeySlotWithUsage) =>
    setEdit({
      slot,
      label: slot.label,
      is_enabled: slot.is_enabled,
      daily_pool: Object.fromEntries((groupsByProvider.get(slot.provider) || []).map((g) => [g.group_key, String(slot.daily_pool[g.group_key] ?? 0)])),
      reserve_tokens: String(slot.reserve_tokens),
      notes: slot.notes || '',
      change_reason: '',
    });

  const saveEdit = async () => {
    if (!edit) return;
    const pool: Record<string, number> = {};
    for (const [k, v] of Object.entries(edit.daily_pool)) {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) { toast.error(t('aiKeys.invalidPool', { group: k })); return; }
      if (n > 0) pool[k] = n;
    }
    const reserve = Number(edit.reserve_tokens);
    if (!Number.isInteger(reserve) || reserve < 0) { toast.error(t('aiKeys.invalidReserve')); return; }
    if (!edit.change_reason.trim()) { toast.error(t('aiKeys.reasonRequired')); return; }
    try {
      await update.mutateAsync({
        provider: edit.slot.provider,
        slotNo: edit.slot.slot_no,
        patch: { label: edit.label.trim() || edit.slot.label, is_enabled: edit.is_enabled, daily_pool: pool, reserve_tokens: reserve, notes: edit.notes.trim() || null, change_reason: edit.change_reason.trim() },
      });
      toast.success(t('aiKeys.saved'));
      setEdit(null);
    } catch (e) {
      toast.error((e as Error)?.message || t('aiKeys.saveError'));
    }
  };

  const runCheck = async (probe: boolean) => {
    try {
      const r = await check.mutateAsync(probe);
      toast.success(t('aiKeys.checked', { n: r.keys.length }));
    } catch (e) {
      toast.error((e as Error)?.message || t('aiKeys.checkError'));
    }
  };

  const recentRows = useMemo(() => (recentQ.data || []).filter((r) => r.day !== new Date().toISOString().slice(0, 10)), [recentQ.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('aiKeys.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('aiKeys.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => runCheck(false)} disabled={check.isPending}>
            <KeyRound className="h-4 w-4 mr-2" />
            {t('aiKeys.checkSecrets')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => runCheck(true)} disabled={check.isPending}>
            <ShieldCheck className={`h-4 w-4 mr-2 ${check.isPending ? 'animate-pulse' : ''}`} />
            {t('aiKeys.probeProviders')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { slotsQ.refetch(); recentQ.refetch(); }} disabled={slotsQ.isFetching}>
            <RefreshCw className={`h-4 w-4 ${slotsQ.isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Alert>
        <AlertDescription>{t('aiKeys.howItWorks')}</AlertDescription>
      </Alert>

      {(slotsQ.isError || groupsQ.isError) && (
        <Alert variant="destructive">
          <AlertDescription>{((slotsQ.error || groupsQ.error) as Error)?.message || t('aiKeys.loadError')}</AlertDescription>
        </Alert>
      )}
      {check.data && (
        <p className="text-xs text-muted-foreground">{t('aiKeys.lastChecked')}: {fmtTime(check.data.checked_at)}</p>
      )}

      {slotsQ.isLoading ? (
        <Skeleton className="h-60 w-full" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(slotsQ.data || []).map((s) => {
            const st = statusByKey.get(`${s.provider}#${s.slot_no}`);
            const groups = groupsByProvider.get(s.provider) || [];
            const pooled = groups.filter((g) => (s.daily_pool[g.group_key] ?? 0) > 0);
            return (
              <Card key={`${s.provider}#${s.slot_no}`}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{s.label}</CardTitle>
                      <div className="text-xs text-muted-foreground font-mono">{s.provider} · {t('aiKeys.slot')} {s.slot_no} · {s.env_var}</div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={s.is_enabled ? 'success' : 'secondary'}>{s.is_enabled ? t('aiKeys.enabled') : t('aiKeys.disabled')}</Badge>
                      {st && (
                        <Badge variant={st.configured ? 'success' : 'destructive'}>
                          {st.configured ? t('aiKeys.secretSet') : t('aiKeys.secretMissing')}
                        </Badge>
                      )}
                      {st?.probe && (
                        <Badge variant={st.probe.ok ? 'success' : 'destructive'}>
                          {st.probe.ok ? t('aiKeys.providerOk') : `${t('aiKeys.providerRejected')} ${st.probe.http_status ?? ''}`}
                        </Badge>
                      )}
                      {s.today.limitedCalls > 0 && <Badge variant="warning">{t('aiKeys.limitedToday', { n: s.today.limitedCalls })}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pooled.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('aiKeys.noPool')}</p>
                  ) : (
                    pooled.map((g) => {
                      const pool = s.daily_pool[g.group_key];
                      const used = s.today.usedByGroup[g.group_key] || 0;
                      const pct = Math.min(100, Math.round((used / pool) * 100));
                      const spent = used + s.reserve_tokens >= pool;
                      return (
                        <div key={g.group_key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span>{g.name} <span className="font-mono text-muted-foreground">{g.group_key}</span></span>
                            <span className="tabular-nums">
                              {fmtTokens(used)} / {fmtTokens(pool)} ({pct}%)
                              {spent && <Badge variant="warning" className="ml-2">{t('aiKeys.poolSpent')}</Badge>}
                            </span>
                          </div>
                          <Progress value={pct} />
                        </div>
                      );
                    })
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                    <div><span className="text-muted-foreground">{t('aiKeys.callsToday')}:</span> <span className="tabular-nums">{s.today.calls}</span></div>
                    <div><span className="text-muted-foreground">{t('aiKeys.freeCalls')}:</span> <span className="tabular-nums">{s.today.freeCalls}</span></div>
                    <div><span className="text-muted-foreground">{t('aiKeys.paidCalls')}:</span> <span className="tabular-nums">{s.today.paidCalls}</span></div>
                    <div><span className="text-muted-foreground">{t('aiKeys.failedCalls')}:</span> <span className="tabular-nums">{s.today.failedCalls}</span></div>
                    <div><span className="text-muted-foreground">{t('aiKeys.costToday')}:</span> <span className="tabular-nums">{fmtUsd(s.today.costUsd)}</span></div>
                    <div><span className="text-muted-foreground">{t('aiKeys.reserve')}:</span> <span className="tabular-nums">{fmtTokens(s.reserve_tokens)}</span></div>
                    <div className="col-span-2 sm:col-span-3"><span className="text-muted-foreground">{t('aiKeys.lastCall')}:</span> {fmtTime(s.today.lastCallAt)}</div>
                    <div className="col-span-2 sm:col-span-3"><span className="text-muted-foreground">{t('aiKeys.lastError')}:</span> {fmtTime(s.today.lastErrorAt)}</div>
                  </div>
                  {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => openEdit(s)}>{t('aiKeys.edit')}</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('aiKeys.groups')}</CardTitle>
        </CardHeader>
        <CardContent>
          {groupsQ.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('aiKeys.group')}</TableHead>
                    <TableHead>{t('aiKeys.provider')}</TableHead>
                    <TableHead>{t('aiKeys.models')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(groupsQ.data || []).map((g) => (
                    <TableRow key={g.group_key}>
                      <TableCell className="align-top">
                        <div className="font-medium">{g.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{g.group_key}</div>
                        <div className="text-xs text-muted-foreground">{g.description}</div>
                      </TableCell>
                      <TableCell className="align-top">{g.provider}{!g.is_active && <Badge variant="secondary" className="ml-2">{t('aiKeys.inactive')}</Badge>}</TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap gap-1">
                          {g.api_model_ids.map((id) => <Badge key={id} variant="outline" className="font-mono text-xs">{id}</Badge>)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(groupsQ.data?.length || 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">{t('aiKeys.noGroups')}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">{t('aiKeys.groupsNote')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('aiKeys.recent')}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentQ.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('aiKeys.day')}</TableHead>
                    <TableHead>{t('aiKeys.key')}</TableHead>
                    <TableHead>{t('aiKeys.group')}</TableHead>
                    <TableHead>{t('aiKeys.pool')}</TableHead>
                    <TableHead className="text-right">{t('aiKeys.calls')}</TableHead>
                    <TableHead className="text-right">{t('aiKeys.tokens')}</TableHead>
                    <TableHead className="text-right">{t('aiKeys.cost')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="tabular-nums">{r.day}</TableCell>
                      <TableCell className="font-mono text-xs">{r.provider}#{r.key_slot}</TableCell>
                      <TableCell className="font-mono text-xs">{r.group_key || '—'}</TableCell>
                      <TableCell>{t(`aiKeys.pools.${r.pool}`)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.ok_calls}/{r.calls}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtTokens(Number(r.tokens || 0))}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtUsd(Number(r.cost_usd || 0))}</TableCell>
                    </TableRow>
                  ))}
                  {recentRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">{t('aiKeys.noRecent')}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!edit} onOpenChange={(open) => { if (!open) setEdit(null); }}>
        <DialogContent className="max-w-lg">
          {edit && (
            <>
              <DialogHeader>
                <DialogTitle>{t('aiKeys.editTitle', { label: edit.slot.label })}</DialogTitle>
                <DialogDescription className="font-mono text-xs">{edit.slot.provider} · {t('aiKeys.slot')} {edit.slot.slot_no} · {edit.slot.env_var}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="ai-key-label">{t('aiKeys.label')}</Label>
                  <Input id="ai-key-label" value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="ai-key-enabled">{t('aiKeys.enabledField')}</Label>
                  <Switch id="ai-key-enabled" checked={edit.is_enabled} onCheckedChange={(v) => setEdit({ ...edit, is_enabled: v })} />
                </div>
                {(groupsByProvider.get(edit.slot.provider) || []).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{t('aiKeys.dailyPool')}</Label>
                      {edit.slot.provider === 'openai' && (
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEdit({ ...edit, daily_pool: Object.fromEntries(Object.entries(OPENAI_TIER_DEFAULTS.tier1_2).map(([k, v]) => [k, String(v)])) })}>{t('aiKeys.tier12')}</Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEdit({ ...edit, daily_pool: Object.fromEntries(Object.entries(OPENAI_TIER_DEFAULTS.tier3_5).map(([k, v]) => [k, String(v)])) })}>{t('aiKeys.tier35')}</Button>
                        </div>
                      )}
                    </div>
                    {(groupsByProvider.get(edit.slot.provider) || []).map((g) => (
                      <div key={g.group_key} className="grid grid-cols-2 items-center gap-2">
                        <Label htmlFor={`pool-${g.group_key}`} className="text-xs">{g.name} <span className="font-mono text-muted-foreground">{g.group_key}</span></Label>
                        <Input id={`pool-${g.group_key}`} inputMode="numeric" value={edit.daily_pool[g.group_key] ?? '0'} onChange={(e) => setEdit({ ...edit, daily_pool: { ...edit.daily_pool, [g.group_key]: e.target.value } })} />
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">{t('aiKeys.poolHelp')}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="ai-key-reserve">{t('aiKeys.reserve')}</Label>
                  <Input id="ai-key-reserve" inputMode="numeric" value={edit.reserve_tokens} onChange={(e) => setEdit({ ...edit, reserve_tokens: e.target.value })} />
                  <p className="text-xs text-muted-foreground">{t('aiKeys.reserveHelp')}</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ai-key-notes">{t('aiKeys.notes')}</Label>
                  <Textarea id="ai-key-notes" rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ai-key-reason">{t('aiKeys.changeReason')}</Label>
                  <Input id="ai-key-reason" value={edit.change_reason} onChange={(e) => setEdit({ ...edit, change_reason: e.target.value })} placeholder={t('aiKeys.changeReasonHint')} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEdit(null)} disabled={update.isPending}>{t('aiKeys.cancel')}</Button>
                <Button onClick={saveEdit} disabled={update.isPending}>{t('aiKeys.save')}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
