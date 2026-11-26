// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007  (NEW FILE)
// PATH: src/pages/super-admin/ActivationCodes.tsx
//
// CHANGE LOG
// 2026-11-25 (2) — Codes tab says when its list is cut at 1000 rows.
// 2026-11-25 — Farmer activation codes (SaaS admin). Pick a tenant, record what it bought (licences
//   and validity), generate a batch of single-use codes inside the licences left, release the batch
//   to the tenant, download the printable sheet (one QR per code) or a CSV, revoke unused codes, and
//   read the activation history. Every action is a database function that checks the signed-in
//   admin itself; this screen holds no rule of its own. Plain codes exist here only inside the
//   download handler and are dropped as soon as the file is built.
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ban, Download, FileSpreadsheet, KeyRound, Plus, QrCode, Send, ShieldCheck } from 'lucide-react';
import i18n from '@/i18n';
import {
  useActivationBatches, useActivationCodes, useActivationHistory, useActivationTenants, useActivationUsage,
  useFarmerPlans, useGenerateBatch, useReleaseBatch, useRevokeCodes, useSetEntitlement,
} from '@/hooks/useActivationCodes';
import {
  ActivationCodeService, activationErrorKey, CODES_LIST_LIMIT,
  type ActivationBatch, type ActivationState, type BatchStateCounts, type SubscriptionInterval,
} from '@/services/ActivationCodeService';

const STATES: ActivationState[] = ['GENERATED', 'AVAILABLE', 'ACTIVATED', 'EXPIRED', 'REVOKED'];
const MAX_BATCH = 2000;

const fmtDate = (iso: string | null | undefined) => (iso ? format(new Date(iso), 'dd MMM yyyy') : '—');
const fmtDateTime = (iso: string | null | undefined) => (iso ? format(new Date(iso), 'dd MMM yyyy, HH:mm') : '—');
const dateInput = (d: Date) => format(d, 'yyyy-MM-dd');
const endOfDay = (yyyyMmDd: string) => new Date(`${yyyyMmDd}T23:59:59`);
const addDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d; };
const shortId = (id: string | null | undefined) => (id ? id.slice(0, 8) : '—');

const stateVariant = (s: ActivationState): 'default' | 'secondary' | 'destructive' | 'outline' =>
  s === 'ACTIVATED' ? 'default' : s === 'AVAILABLE' ? 'secondary' : s === 'REVOKED' ? 'destructive' : 'outline';

type RevokeTarget = { batchId?: string; codeIds?: string[]; count: number } | null;
type DownloadTarget = { batch: ActivationBatch; kind: 'pdf' | 'csv' } | null;

export default function ActivationCodes() {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tab, setTab] = useState('batches');
  const [codeState, setCodeState] = useState<ActivationState | 'ALL'>('ALL');
  const [codeBatch, setCodeBatch] = useState<string | null>(null);

  const [entitlementOpen, setEntitlementOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget>(null);
  const [downloadTarget, setDownloadTarget] = useState<DownloadTarget>(null);
  const [downloading, setDownloading] = useState(false);

  const tenantsQ = useActivationTenants();
  const usageQ = useActivationUsage(tenantId);
  const batchesQ = useActivationBatches(tenantId);
  const plansQ = useFarmerPlans(tenantId);
  const codesQ = useActivationCodes(tenantId, codeBatch, codeState === 'ALL' ? null : codeState, tab === 'codes');
  const historyQ = useActivationHistory(tenantId, tab === 'history');

  const release = useReleaseBatch();
  const revoke = useRevokeCodes();

  const tenant = useMemo(() => (tenantsQ.data || []).find((x) => x.id === tenantId) || null, [tenantsQ.data, tenantId]);
  const planName = useMemo(() => {
    const m = new Map<string, string>();
    (plansQ.data || []).forEach((p) => m.set(p.id, p.name));
    return m;
  }, [plansQ.data]);

  const usage = usageQ.data;
  const errText = (e: unknown) => t(`activation.errors.${activationErrorKey(e)}`);

  const onRelease = (batch: ActivationBatch) =>
    release.mutate(batch.id, {
      onSuccess: (r) => toast.success(t('activation.toast.released', { count: r.released })),
      onError: (e) => toast.error(errText(e)),
    });

  const onDownload = async () => {
    if (!downloadTarget || !tenant) return;
    const { batch, kind } = downloadTarget;
    setDownloading(true);
    try {
      // Plain codes live only inside this block.
      let codes = await ActivationCodeService.revealCodes(batch.id);
      if (codes.length === 0) {
        toast.info(t('activation.download.none'));
        return;
      }
      const sheet = await import('@/lib/activation/codeSheet');
      const meta = { tenantName: tenant.name, batchLabel: batch.batch_label, expiresAt: batch.expires_at };
      // The PDF fonts are Latin-only, so its words always come from the English strings.
      const en = i18n.getFixedT('en', 'admin');
      const blob = kind === 'pdf'
        ? sheet.buildPdf(codes, meta, {
            title: en('activation.sheet.title'), validUntil: en('activation.sheet.validUntil'),
            sheet: en('activation.sheet.sheet'), of: en('activation.sheet.of'),
            printed: en('activation.sheet.printed'), cardNote: en('activation.sheet.cardNote'),
          })
        : sheet.buildCsv(codes, meta);
      sheet.downloadBlob(blob, sheet.sheetFilename(meta, batch.id, kind));
      toast.success(t('activation.toast.downloaded', { count: codes.length }));
      codes = [];
      queryClient.invalidateQueries({ queryKey: ['activation-codes', 'history', tenantId] });
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setDownloading(false);
      setDownloadTarget(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <QrCode className="h-7 w-7" /> {t('activation.title')}
          </h1>
          <p className="text-muted-foreground">{t('activation.subtitle')}</p>
        </div>
        <div className="w-full sm:w-80">
          <Label className="text-xs text-muted-foreground">{t('activation.tenant')}</Label>
          {tenantsQ.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={tenantId ?? ''} onValueChange={(v) => { setTenantId(v); setCodeBatch(null); }}>
              <SelectTrigger><SelectValue placeholder={t('activation.selectTenant')} /></SelectTrigger>
              <SelectContent>
                {(tenantsQ.data || []).map((x) => (
                  <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {tenantsQ.error && (
        <Alert variant="destructive"><AlertDescription>{errText(tenantsQ.error)}</AlertDescription></Alert>
      )}

      {!tenantId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">{t('activation.pickTenantFirst')}</CardContent>
        </Card>
      ) : (
        <>
          {usage && !usage.enforced && (
            <Alert><AlertDescription>{t('activation.notEnforced')}</AlertDescription></Alert>
          )}
          {usageQ.error && (
            <Alert variant="destructive"><AlertDescription>{errText(usageQ.error)}</AlertDescription></Alert>
          )}

          {/* Licence summary */}
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> {t('activation.licence.title')}</CardTitle>
                <CardDescription>{t('activation.licence.subtitle')}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEntitlementOpen(true)}>
                  <KeyRound className="h-4 w-4 mr-2" /> {t('activation.licence.set')}
                </Button>
                <Button onClick={() => setGenerateOpen(true)} disabled={!usage?.subscription.active || (usage?.can_still_issue ?? 0) < 1}>
                  <Plus className="h-4 w-4 mr-2" /> {t('activation.generate.open')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {usageQ.isLoading || !usage ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <Stat label={t('activation.licence.purchased')} value={usage.seat_limit ?? 0} />
                    <Stat label={t('activation.licence.activated')} value={usage.seats_used} />
                    <Stat label={t('activation.licence.remaining')} value={usage.seats_remaining} />
                    <Stat label={t('activation.licence.unusedCodes')} value={(usage.codes.available || 0) + (usage.codes.generated || 0)} />
                    <Stat label={t('activation.licence.canIssue')} value={usage.can_still_issue ?? 0} />
                  </div>
                  <Progress value={usage.seat_limit ? Math.min(100, (usage.seats_used / usage.seat_limit) * 100) : 0} />
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{t('activation.licence.subscription')}</span>
                    <Badge variant={usage.subscription.active ? 'default' : 'destructive'}>
                      {usage.subscription.active ? t('activation.licence.active') : t('activation.licence.inactive')}
                    </Badge>
                    <span className="text-muted-foreground">
                      {usage.subscription.status
                        ? t('activation.licence.validUntil', { date: fmtDate(usage.subscription.period_end) })
                        : t('activation.licence.noSubscription')}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="batches">{t('activation.tabs.batches')}</TabsTrigger>
              <TabsTrigger value="codes">{t('activation.tabs.codes')}</TabsTrigger>
              <TabsTrigger value="history">{t('activation.tabs.history')}</TabsTrigger>
            </TabsList>

            <TabsContent value="batches">
              <Card>
                <CardContent className="pt-6">
                  {batchesQ.isLoading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : batchesQ.error ? (
                    <Alert variant="destructive"><AlertDescription>{errText(batchesQ.error)}</AlertDescription></Alert>
                  ) : (batchesQ.data?.batches.length || 0) === 0 ? (
                    <div className="text-sm text-muted-foreground py-8 text-center">{t('activation.batches.empty')}</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('activation.batches.batch')}</TableHead>
                          <TableHead>{t('activation.batches.codes')}</TableHead>
                          <TableHead>{t('activation.batches.plan')}</TableHead>
                          <TableHead>{t('activation.batches.expires')}</TableHead>
                          <TableHead>{t('activation.batches.released')}</TableHead>
                          <TableHead className="text-right">{t('activation.batches.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchesQ.data!.batches.map((b) => {
                          const c: BatchStateCounts = batchesQ.data!.counts[b.id] ||
                            { batch_id: b.id, generated: 0, available: 0, activated: 0, expired: 0, revoked: 0 };
                          const unused = c.generated + c.available;
                          return (
                            <TableRow key={b.id}>
                              <TableCell>
                                <div className="font-medium">{b.batch_label || t('activation.batches.unnamed')}</div>
                                <div className="text-xs text-muted-foreground font-mono">{shortId(b.id)} · {fmtDate(b.created_at)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{b.code_count}</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {STATES.map((s) => {
                                    const n = c[s.toLowerCase() as keyof Omit<BatchStateCounts, 'batch_id'>];
                                    return n > 0 ? (
                                      <Badge key={s} variant={stateVariant(s)}>{t(`activation.states.${s}`)} {n}</Badge>
                                    ) : null;
                                  })}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>{planName.get(b.farmer_plan_id) || shortId(b.farmer_plan_id)}</div>
                                <div className="text-xs text-muted-foreground">{t(`activation.intervals.${b.subscription_interval}`)}</div>
                              </TableCell>
                              <TableCell>{fmtDate(b.expires_at)}</TableCell>
                              <TableCell>{b.released_at ? fmtDate(b.released_at) : <Badge variant="outline">{t('activation.batches.notReleased')}</Badge>}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-wrap justify-end gap-2">
                                  {c.generated > 0 && (
                                    <Button size="sm" onClick={() => onRelease(b)} disabled={release.isPending}>
                                      <Send className="h-4 w-4 mr-1" /> {t('activation.batches.release')}
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline" disabled={unused === 0} onClick={() => setDownloadTarget({ batch: b, kind: 'pdf' })}>
                                    <Download className="h-4 w-4 mr-1" /> {t('activation.batches.pdf')}
                                  </Button>
                                  <Button size="sm" variant="outline" disabled={unused === 0} onClick={() => setDownloadTarget({ batch: b, kind: 'csv' })}>
                                    <FileSpreadsheet className="h-4 w-4 mr-1" /> {t('activation.batches.csv')}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => { setCodeBatch(b.id); setCodeState('ALL'); setTab('codes'); }}>
                                    {t('activation.batches.view')}
                                  </Button>
                                  <Button size="sm" variant="destructive" disabled={unused === 0} onClick={() => setRevokeTarget({ batchId: b.id, count: unused })}>
                                    <Ban className="h-4 w-4 mr-1" /> {t('activation.batches.revoke')}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="codes">
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                  <CardDescription>{t('activation.codes.note')}</CardDescription>
                  <div className="flex flex-wrap gap-2">
                    {codeBatch && (
                      <Button size="sm" variant="outline" onClick={() => setCodeBatch(null)}>
                        {t('activation.codes.allBatches')} ({shortId(codeBatch)})
                      </Button>
                    )}
                    <Select value={codeState} onValueChange={(v) => setCodeState(v as ActivationState | 'ALL')}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t('activation.codes.allStates')}</SelectItem>
                        {STATES.map((s) => <SelectItem key={s} value={s}>{t(`activation.states.${s}`)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {codesQ.isLoading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : codesQ.error ? (
                    <Alert variant="destructive"><AlertDescription>{errText(codesQ.error)}</AlertDescription></Alert>
                  ) : (codesQ.data?.length || 0) === 0 ? (
                    <div className="text-sm text-muted-foreground py-8 text-center">{t('activation.codes.empty')}</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('activation.codes.code')}</TableHead>
                          <TableHead>{t('activation.codes.state')}</TableHead>
                          <TableHead>{t('activation.codes.batch')}</TableHead>
                          <TableHead>{t('activation.codes.expires')}</TableHead>
                          <TableHead>{t('activation.codes.activatedOn')}</TableHead>
                          <TableHead>{t('activation.codes.farmer')}</TableHead>
                          <TableHead className="text-right">{t('activation.batches.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {codesQ.data!.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-mono">••••-••••-{c.code_hint || '????'}</TableCell>
                            <TableCell><Badge variant={stateVariant(c.state)}>{t(`activation.states.${c.state}`)}</Badge></TableCell>
                            <TableCell className="font-mono text-xs">{shortId(c.batch_id)}</TableCell>
                            <TableCell>{fmtDate(c.expires_at)}</TableCell>
                            <TableCell>{fmtDateTime(c.redeemed_at)}</TableCell>
                            <TableCell className="font-mono text-xs">{shortId(c.redeemed_by)}</TableCell>
                            <TableCell className="text-right">
                              {(c.state === 'GENERATED' || c.state === 'AVAILABLE') && (
                                <Button size="sm" variant="ghost" onClick={() => setRevokeTarget({ codeIds: [c.id], count: 1 })}>
                                  <Ban className="h-4 w-4 mr-1" /> {t('activation.batches.revoke')}
                                </Button>
                              )}
                              {c.state === 'REVOKED' && <span className="text-xs text-muted-foreground">{c.revoke_reason}</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {(codesQ.data?.length || 0) >= CODES_LIST_LIMIT && (
                    <p className="text-xs text-muted-foreground pt-3">{t('activation.codes.capped', { count: CODES_LIST_LIMIT })}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader><CardDescription>{t('activation.history.note')}</CardDescription></CardHeader>
                <CardContent>
                  {historyQ.isLoading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : historyQ.error ? (
                    <Alert variant="destructive"><AlertDescription>{errText(historyQ.error)}</AlertDescription></Alert>
                  ) : (historyQ.data?.length || 0) === 0 ? (
                    <div className="text-sm text-muted-foreground py-8 text-center">{t('activation.history.empty')}</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('activation.history.when')}</TableHead>
                          <TableHead>{t('activation.history.event')}</TableHead>
                          <TableHead>{t('activation.history.result')}</TableHead>
                          <TableHead>{t('activation.history.farmer')}</TableHead>
                          <TableHead>{t('activation.history.by')}</TableHead>
                          <TableHead>{t('activation.history.batch')}</TableHead>
                          <TableHead>{t('activation.history.ip')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyQ.data!.map((h) => (
                          <TableRow key={h.id}>
                            <TableCell className="whitespace-nowrap">{fmtDateTime(h.created_at)}</TableCell>
                            <TableCell>{t(`activation.events.${h.event}`, { defaultValue: h.event })}</TableCell>
                            <TableCell>
                              <Badge variant={h.success ? 'secondary' : 'destructive'}>{h.result_code || '—'}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{shortId(h.farmer_id)}</TableCell>
                            <TableCell className="font-mono text-xs">{shortId(h.actor_id)}</TableCell>
                            <TableCell className="font-mono text-xs">{shortId(h.batch_id)}</TableCell>
                            <TableCell className="font-mono text-xs">{h.ip_address || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {entitlementOpen && usage && (
            <EntitlementDialog
              tenantId={tenantId}
              tenantName={tenant?.name || ''}
              currentLicences={usage.seat_limit ?? 0}
              seatsUsed={usage.seats_used}
              currentValidUntil={usage.subscription.period_end}
              onClose={() => setEntitlementOpen(false)}
              errText={errText}
            />
          )}
          {generateOpen && usage && (
            <GenerateDialog
              tenantId={tenantId}
              tenantName={tenant?.name || ''}
              canIssue={usage.can_still_issue ?? 0}
              plans={plansQ.data || []}
              onClose={() => setGenerateOpen(false)}
              errText={errText}
            />
          )}
          {revokeTarget && (
            <RevokeDialog
              count={revokeTarget.count}
              pending={revoke.isPending}
              onClose={() => setRevokeTarget(null)}
              onConfirm={(reason) =>
                revoke.mutate({ batchId: revokeTarget.batchId, codeIds: revokeTarget.codeIds, reason }, {
                  onSuccess: (n) => { toast.success(t('activation.toast.revoked', { count: n })); setRevokeTarget(null); },
                  onError: (e) => toast.error(errText(e)),
                })
              }
            />
          )}

          <AlertDialog open={!!downloadTarget} onOpenChange={(o) => { if (!o && !downloading) setDownloadTarget(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('activation.download.title')}</AlertDialogTitle>
                <AlertDialogDescription>{t('activation.download.warning')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={downloading}>{t('activation.cancel')}</AlertDialogCancel>
                <AlertDialogAction disabled={downloading} onClick={(e) => { e.preventDefault(); void onDownload(); }}>
                  {downloading ? t('activation.download.building') : t('activation.download.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}

function EntitlementDialog(props: {
  tenantId: string; tenantName: string; currentLicences: number; seatsUsed: number;
  currentValidUntil: string | null; onClose: () => void; errText: (e: unknown) => string;
}) {
  const { t } = useTranslation('admin');
  const save = useSetEntitlement();
  const [licences, setLicences] = useState(String(props.currentLicences));
  const [validUntil, setValidUntil] = useState(
    props.currentValidUntil && new Date(props.currentValidUntil) > new Date()
      ? dateInput(new Date(props.currentValidUntil)) : dateInput(addDays(365)),
  );
  const [reason, setReason] = useState('');
  const n = Number(licences);
  const valid = Number.isInteger(n) && n >= props.seatsUsed && n <= 1_000_000 && !!validUntil
    && endOfDay(validUntil) > new Date() && reason.trim().length >= 5;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) props.onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('activation.entitlement.title', { tenant: props.tenantName })}</DialogTitle>
          <DialogDescription>{t('activation.entitlement.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="ent-licences">{t('activation.entitlement.licences')}</Label>
            <Input id="ent-licences" type="number" min={props.seatsUsed} max={1000000} value={licences} onChange={(e) => setLicences(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">{t('activation.entitlement.licencesHint', { used: props.seatsUsed })}</p>
          </div>
          <div>
            <Label htmlFor="ent-valid">{t('activation.entitlement.validUntil')}</Label>
            <Input id="ent-valid" type="date" min={dateInput(addDays(1))} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ent-reason">{t('activation.reasonLabel')}</Label>
            <Textarea id="ent-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('activation.entitlement.reasonPlaceholder')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose}>{t('activation.cancel')}</Button>
          <Button
            disabled={!valid || save.isPending}
            onClick={() =>
              save.mutate({ tenantId: props.tenantId, licences: n, validUntil: endOfDay(validUntil), reason: reason.trim() }, {
                onSuccess: () => { toast.success(t('activation.toast.entitlementSaved')); props.onClose(); },
                onError: (e) => toast.error(props.errText(e)),
              })
            }
          >
            {t('activation.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GenerateDialog(props: {
  tenantId: string; tenantName: string; canIssue: number;
  plans: Array<{ id: string; name: string }>; onClose: () => void; errText: (e: unknown) => string;
}) {
  const { t } = useTranslation('admin');
  const generate = useGenerateBatch();
  const maxCount = Math.min(MAX_BATCH, props.canIssue);
  const [count, setCount] = useState(String(Math.min(100, maxCount)));
  const [expires, setExpires] = useState(dateInput(addDays(90)));
  const [planId, setPlanId] = useState('');
  const [interval, setInterval] = useState<SubscriptionInterval>('annually');
  const [label, setLabel] = useState('');
  const n = Number(count);
  const valid = Number.isInteger(n) && n >= 1 && n <= maxCount && !!planId && !!expires && endOfDay(expires) > new Date();

  return (
    <Dialog open onOpenChange={(o) => { if (!o) props.onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('activation.generate.title', { tenant: props.tenantName })}</DialogTitle>
          <DialogDescription>{t('activation.generate.description', { count: props.canIssue })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gen-count">{t('activation.generate.count')}</Label>
              <Input id="gen-count" type="number" min={1} max={maxCount} value={count} onChange={(e) => setCount(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">{t('activation.generate.countHint', { max: maxCount })}</p>
            </div>
            <div>
              <Label htmlFor="gen-expires">{t('activation.generate.expires')}</Label>
              <Input id="gen-expires" type="date" min={dateInput(addDays(1))} max={dateInput(addDays(1095))} value={expires} onChange={(e) => setExpires(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('activation.generate.plan')}</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger><SelectValue placeholder={t('activation.generate.planPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {props.plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('activation.generate.interval')}</Label>
              <Select value={interval} onValueChange={(v) => setInterval(v as SubscriptionInterval)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="biannual">{t('activation.intervals.biannual')}</SelectItem>
                  <SelectItem value="annually">{t('activation.intervals.annually')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="gen-label">{t('activation.generate.label')}</Label>
            <Input id="gen-label" maxLength={120} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('activation.generate.labelPlaceholder')} />
          </div>
          <Alert><AlertDescription>{t('activation.generate.note')}</AlertDescription></Alert>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose}>{t('activation.cancel')}</Button>
          <Button
            disabled={!valid || generate.isPending}
            onClick={() =>
              generate.mutate({ tenantId: props.tenantId, count: n, expiresAt: endOfDay(expires), interval, farmerPlanId: planId, label }, {
                onSuccess: (r) => { toast.success(t('activation.toast.generated', { count: r.code_count })); props.onClose(); },
                onError: (e) => toast.error(props.errText(e)),
              })
            }
          >
            {generate.isPending ? t('activation.generate.working') : t('activation.generate.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RevokeDialog(props: { count: number; pending: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const { t } = useTranslation('admin');
  const [reason, setReason] = useState('');
  return (
    <Dialog open onOpenChange={(o) => { if (!o) props.onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('activation.revoke.title', { count: props.count })}</DialogTitle>
          <DialogDescription>{t('activation.revoke.description')}</DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="rev-reason">{t('activation.reasonLabel')}</Label>
          <Textarea id="rev-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose}>{t('activation.cancel')}</Button>
          <Button variant="destructive" disabled={reason.trim().length < 5 || props.pending} onClick={() => props.onConfirm(reason.trim())}>
            {t('activation.revoke.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
