import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminAuthWrapper } from '@/components/auth/AdminAuthWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import {
  ArrowLeft, ExternalLink, Pencil, Undo2, ShieldAlert, CheckCircle2, Loader2,
} from 'lucide-react';
import {
  useDecisionRuleDetail,
  useRuleFindings,
  useRuleEvidence,
  useRulePerformance,
  useRuleConflicts,
  useRuleLineage,
  useRuleVersions,
  useRuleApproval,
  isFindingBlocking,
  isFindingOpen,
  type FindingRow,
  type EvidenceRow,
} from '@/hooks/useDecisionRules';
import {
  useTransitionApproval,
  useRollbackToVersion,
  useUpdateRuleFields,
  useResolveFinding,
  useSubmitForReview,
  EDITABLE_RULE_FIELDS,
  type ApprovalState,
} from '@/hooks/useGovernanceMutations';

const NEXT_STATES: Record<string, ApprovalState[]> = {
  draft: ['review', 'rejected'],
  review: ['approved', 'rejected', 'draft'],
  approved: ['published', 'deprecated'],
  published: ['deprecated'],
  deprecated: [],
  rejected: ['draft'],
};

const NUMERIC_FIELDS = new Set(['phi_days', 'confidence_score']);
const NOTE_REQUIRED: ApprovalState[] = ['approved', 'published'];

const TIER: Record<number, { label: string; className: string }> = {
  1: { label: 'T1 · Regulatory', className: 'bg-destructive text-destructive-foreground' },
  2: { label: 'T2 · ICAR/SAU', className: 'bg-emerald-600 text-white' },
  3: { label: 'T3 · Peer-reviewed', className: 'bg-blue-600 text-white' },
  4: { label: 'T4 · Registrant label', className: 'bg-violet-600 text-white' },
  5: { label: 'T5 · Extension', className: 'bg-muted text-muted-foreground' },
  6: { label: 'T6 · Aggregator', className: 'border border-border text-foreground' },
};

const Muted = () => <span className="text-muted-foreground">— not set —</span>;

const Empty: React.FC<{ msg: string }> = ({ msg }) => (
  <div className="text-sm text-muted-foreground py-6 text-center">{msg}</div>
);

const RuleReview: React.FC = () => {
  const { ruleUuid = '' } = useParams<{ ruleUuid: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const queue: string[] | undefined = (location.state as any)?.queue;
  const queueIndex: number | undefined = (location.state as any)?.index;
  const hasQueue = Array.isArray(queue) && queue.length > 0 && typeof queueIndex === 'number';
  const nextUuid = hasQueue ? queue![queueIndex! + 1] : undefined;
  const prevUuid = hasQueue ? queue![queueIndex! - 1] : undefined;

  const goTo = (uuid: string, index: number) =>
    navigate(`/super-admin/governance/review/${uuid}`, { state: { queue, index } });

  const { data: rule, isLoading } = useDecisionRuleDetail(ruleUuid || null);
  const ruleTextId = (rule as any)?.rule_id ?? null;

  const { data: findings, isLoading: findingsLoading } = useRuleFindings(ruleTextId);
  const { data: evidence, isLoading: evidenceLoading } = useRuleEvidence(ruleTextId);
  const { data: perf } = useRulePerformance(ruleTextId);
  const { data: conflicts } = useRuleConflicts(ruleUuid || null);
  const { data: lineage } = useRuleLineage(ruleUuid || null);
  const { data: versions } = useRuleVersions(ruleUuid || null);
  const { data: approvals } = useRuleApproval(ruleUuid || null);

  const transition = useTransitionApproval();
  const rollback = useRollbackToVersion();
  const updateFields = useUpdateRuleFields();
  const resolveFinding = useResolveFinding();
  const submitForReview = useSubmitForReview();

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [verifiedAgainst, setVerifiedAgainst] = useState('');
  const [refusal, setRefusal] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState<Record<string, string>>({});
  const [confirmLiveSave, setConfirmLiveSave] = useState(false);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const r = rule as any;
  const workflow = (approvals || [])[0] as any | undefined;
  const workflowState: string | undefined = workflow?.state;
  const isOwnSubmission =
    !!workflow?.submitted_by && !!currentUserId && workflow.submitted_by === currentUserId;

  const openFindings = useMemo(
    () => (findings || []).filter((f) => isFindingOpen(f)),
    [findings]
  );
  const resolvedFindings = useMemo(
    () => (findings || []).filter((f) => !isFindingOpen(f)),
    [findings]
  );
  const blockingCount = useMemo(
    () => (findings || []).filter((f) => isFindingBlocking(f)).length,
    [findings]
  );

  const dirty = Object.keys(edits).length > 0;

  const advanceIfQueued = () => {
    if (hasQueue && nextUuid) {
      setTimeout(() => goTo(nextUuid, queueIndex! + 1), 800);
    }
  };

  const saveFields = () => {
    const payload: Record<string, unknown> = {};
    Object.entries(edits).forEach(([k, v]) => {
      if (v === '') payload[k] = null;
      else payload[k] = NUMERIC_FIELDS.has(k) ? Number(v) : v;
    });
    updateFields.mutate(
      { ruleUuid, fields: payload },
      {
        onSuccess: () => {
          setEdits({});
          setEditing({});
          qc.invalidateQueries({ queryKey: ['rule-findings', ruleTextId] });
        },
        onError: (e: any) => setRefusal(e?.message || 'Update refused'),
      }
    );
  };

  const onSaveClick = () => {
    if (r?.is_farmer_servable) setConfirmLiveSave(true);
    else saveFields();
  };

  const runTransition = (newState: ApprovalState) => {
    setRefusal(null);
    setSubmitNotice(null);
    if (NOTE_REQUIRED.includes(newState) && !verifiedAgainst.trim()) {
      setRefusal('Enter the source you verified this rule against before approving or publishing.');
      return;
    }
    const notes = verifiedAgainst.trim() ? `Verified against: ${verifiedAgainst.trim()}` : undefined;
    if (!workflow) {
      submitForReview.mutate(
        { ruleUuid, note: notes },
        {
          onSuccess: () => {
            setSubmitNotice(
              'Submitted for review. You cannot approve your own submission — another super-admin must open this page to approve.'
            );
            advanceIfQueued();
          },
          onError: (e: any) => setRefusal(e?.message || 'Submit refused'),
        }
      );
      return;
    }
    transition.mutate(
      { workflowId: workflow.id, newState, notes },
      {
        onSuccess: () => advanceIfQueued(),
        onError: (e: any) => setRefusal(e?.message || 'Transition refused'),
      }
    );
  };

  if (isLoading) {
    return (
      <AdminAuthWrapper requiredRole="super_admin">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminAuthWrapper>
    );
  }

  if (!rule) {
    return (
      <AdminAuthWrapper requiredRole="super_admin">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Rule not found.</p>
            <Button variant="outline" onClick={() => navigate('/super-admin/governance/rules')}>
              Back to Rules Console
            </Button>
          </CardContent>
        </Card>
      </AdminAuthWrapper>
    );
  }

  const servable = !!r.is_farmer_servable;

  return (
    <AdminAuthWrapper requiredRole="super_admin">
      <div className="space-y-4">
        {/* HEADER */}
        <div className="space-y-2">
          <Link
            to="/super-admin/governance/rules"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Rules Console
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl md:text-2xl font-bold break-all">{r.rule_id}</h1>
            <Badge variant={servable ? 'success' : 'destructive'}>
              {servable ? 'VISIBLE to farmer' : 'NOT VISIBLE to farmer'}
            </Badge>
            {r.expert_approved && <Badge className="bg-blue-600 text-white">expert-approved</Badge>}
            <Badge variant={r.is_active ? 'success' : 'secondary'}>
              {r.is_active ? 'active' : 'inactive'}
            </Badge>
            {r.regulatory_status && (
              <Badge
                variant={
                  ['banned', 'restricted'].includes(String(r.regulatory_status).toLowerCase())
                    ? 'destructive'
                    : 'outline'
                }
              >
                {r.regulatory_status}
              </Badge>
            )}
            {workflowState && <Badge variant="outline">workflow: {workflowState}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {[r.crop_code, r.category, r.action_type].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* MAIN */}
          <div className="lg:col-span-2 space-y-4">
            {/* Farmer-facing */}
            <Card>
              <CardHeader><CardTitle className="text-base">What the farmer sees</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="whitespace-pre-wrap text-base leading-relaxed">
                  {r.action_text || <Muted />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Why (farmer explanation)</h3>
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {r.reason_text || <Muted />}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gate fields */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Gate fields</CardTitle>
                {dirty && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">unsaved changes</span>
                    <Button size="sm" variant="ghost" onClick={() => { setEdits({}); setEditing({}); }}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={onSaveClick} disabled={updateFields.isPending}>
                      {updateFields.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Save
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EDITABLE_RULE_FIELDS.map((f) => {
                  const current = r[f];
                  const isEditing = !!editing[f];
                  return (
                    <div key={f} className="border rounded p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {f.replace(/_/g, ' ')}
                        </span>
                        {!isEditing && (
                          <Button
                            size="icon" variant="ghost" className="h-6 w-6"
                            onClick={() => {
                              setEditing((e) => ({ ...e, [f]: true }));
                              setEdits((e) => ({ ...e, [f]: current == null ? '' : String(current) }));
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {isEditing ? (
                        <Input
                          className="mt-1 h-8"
                          type={NUMERIC_FIELDS.has(f) ? 'number' : 'text'}
                          value={edits[f] ?? ''}
                          onChange={(e) => setEdits((prev) => ({ ...prev, [f]: e.target.value }))}
                        />
                      ) : (
                        <div className="text-sm mt-1 break-words">
                          {current == null || current === '' ? <Muted /> : String(current)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Blockers */}
            <Card>
              <CardHeader><CardTitle className="text-base">Blockers &amp; findings</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {findingsLoading && <Skeleton className="h-16 w-full" />}
                {!findingsLoading && blockingCount > 0 && (
                  <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertDescription>
                      This rule cannot be published until {blockingCount} blocking finding(s) are resolved.
                    </AlertDescription>
                  </Alert>
                )}
                {!findingsLoading && openFindings.length === 0 && (
                  <Empty msg="No open findings." />
                )}
                {openFindings.map((f: FindingRow) => {
                  const blocking = isFindingBlocking(f);
                  return (
                    <div key={f.id} className="border rounded p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={blocking ? 'destructive' : 'warning'}>
                          {blocking ? 'BLOCKING' : 'ADVISORY'}
                        </Badge>
                        <span className="font-mono text-xs">{f.finding_type}</span>
                        <Badge variant="outline">{f.status}</Badge>
                      </div>
                      <div className="text-sm">{f.detail}</div>
                      {(f.detected_value || f.expected_value) && (
                        <div className="text-xs font-mono text-muted-foreground">
                          {f.detected_value ?? '—'} → {f.expected_value ?? '—'}
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          className="h-8"
                          placeholder="Resolution note…"
                          value={resolveNote[f.id] ?? ''}
                          onChange={(e) => setResolveNote((n) => ({ ...n, [f.id]: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={resolveFinding.isPending}
                          onClick={() =>
                            resolveFinding.mutate({
                              findingId: f.id,
                              note: resolveNote[f.id],
                              ruleTextId: ruleTextId ?? undefined,
                            })
                          }
                        >
                          Mark resolved
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {resolvedFindings.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">
                      {resolvedFindings.length} resolved finding(s)
                    </summary>
                    <div className="mt-2 space-y-2">
                      {resolvedFindings.map((f) => (
                        <div key={f.id} className="border rounded p-2 opacity-60 text-xs space-y-1">
                          <div className="font-mono">{f.finding_type}</div>
                          <div>{f.detail}</div>
                          <div className="text-muted-foreground">
                            {f.resolved_by ? `by ${f.resolved_by}` : 'resolved'}
                            {f.resolved_at ? ` · ${format(new Date(f.resolved_at), 'PP')}` : ''}
                            {f.resolution_note ? ` · ${f.resolution_note}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>

            {/* Evidence */}
            <Card>
              <CardHeader><CardTitle className="text-base">Evidence</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {evidenceLoading && <Skeleton className="h-16 w-full" />}
                {!evidenceLoading && (evidence?.length ?? 0) === 0 && (
                  <Empty msg="No evidence linked — verify against a source before approving." />
                )}
                {(evidence || []).map((ev: EvidenceRow) => {
                  const src = ev.knowledge_sources;
                  const tier = src ? TIER[src.authority_tier] : undefined;
                  return (
                    <div key={ev.id} className="border rounded p-3 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {tier && (
                          <span className={`text-xs px-2 py-0.5 rounded ${tier.className}`}>
                            {tier.label}
                          </span>
                        )}
                        <Badge variant="outline">{ev.evidence_role}</Badge>
                        {src?.url && (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div className="text-sm font-medium">{src?.title || 'Unknown source'}</div>
                      <div className="text-xs text-muted-foreground">
                        {[src?.publisher, src?.source_type, src?.publication_year]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                      <div className="text-sm">{ev.claim_supported}</div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Secondary tabs */}
            <Card>
              <CardContent className="pt-4">
                <Tabs defaultValue="telemetry">
                  <TabsList className="flex-wrap h-auto">
                    <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
                    <TabsTrigger value="conflicts">Conflicts ({conflicts?.length ?? 0})</TabsTrigger>
                    <TabsTrigger value="lineage">Lineage ({lineage?.length ?? 0})</TabsTrigger>
                    <TabsTrigger value="versions">Versions ({versions?.length ?? 0})</TabsTrigger>
                    <TabsTrigger value="approval">Approval ({approvals?.length ?? 0})</TabsTrigger>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                  </TabsList>

                  <TabsContent value="telemetry" className="space-y-2">
                    {(perf?.length ?? 0) === 0 ? <Empty msg="No telemetry recorded yet." /> : (
                      (perf || []).map((p: any) => (
                        <div key={p.id} className="border rounded p-3 text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="font-mono text-xs md:col-span-2 truncate">{p.tenant_id}</div>
                          <div>fired: {p.times_fired}</div>
                          <div>success: {Number(p.success_rate || 0).toFixed(1)}%</div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="conflicts" className="space-y-2">
                    {(conflicts?.length ?? 0) === 0 ? <Empty msg="No conflicts detected." /> : (
                      (conflicts || []).map((c: any) => (
                        <div key={c.id} className="border rounded p-3 text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={c.severity === 'critical' ? 'destructive' : 'warning'}>
                              {c.severity}
                            </Badge>
                            <span className="font-medium">{c.conflict_type}</span>
                            {c.resolved && <Badge variant="success">resolved</Badge>}
                          </div>
                          <div className="font-mono text-xs break-all">A: {c.rule_a_id} · B: {c.rule_b_id}</div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="lineage" className="space-y-2">
                    {(lineage?.length ?? 0) === 0 ? <Empty msg="No lineage records." /> : (
                      (lineage || []).map((l: any) => (
                        <div key={l.id} className="border rounded p-3 text-sm space-y-1">
                          <Badge variant="outline">{l.relation_type}</Badge>
                          <div className="font-mono text-xs text-muted-foreground break-all">
                            {l.parent_rule_id === ruleUuid ? `→ ${l.child_rule_id}` : `← ${l.parent_rule_id}`}
                          </div>
                          {l.notes && <div>{l.notes}</div>}
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="versions" className="space-y-2">
                    {(versions?.length ?? 0) === 0 ? <Empty msg="No version history yet." /> : (
                      (versions || []).map((v: any, idx: number) => (
                        <div key={v.id} className="border rounded p-3 text-sm space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge>v{v.version_number}</Badge>
                            <Badge variant="outline">{v.change_type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(v.created_at), 'PP p')}
                            </span>
                            {idx > 0 && (
                              <Button
                                size="sm" variant="outline" className="ml-auto h-7"
                                disabled={rollback.isPending}
                                onClick={() =>
                                  rollback.mutate({
                                    versionId: v.id,
                                    notes: `Rollback to v${v.version_number}`,
                                  })
                                }
                              >
                                <Undo2 className="h-3 w-3 mr-1" /> Rollback
                              </Button>
                            )}
                          </div>
                          {v.change_reason && <div className="text-xs">{v.change_reason}</div>}
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="approval" className="space-y-2">
                    {(approvals?.length ?? 0) === 0 ? <Empty msg="No workflow history." /> : (
                      (approvals || []).map((a: any) => (
                        <div key={a.id} className="border rounded p-3 text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge>{a.state}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(a.updated_at || a.created_at), 'PP p')}
                            </span>
                          </div>
                          {a.agronomist_notes && <div>{a.agronomist_notes}</div>}
                          {a.rejection_reason && (
                            <div className="text-destructive">{a.rejection_reason}</div>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="json">
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {JSON.stringify(r.conditions_json ?? {}, null, 2)}
                    </pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* DECISION SIDEBAR */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-4 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Decision</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {hasQueue && (
                    <div className="space-y-2 border-b pb-3">
                      <div className="text-xs text-muted-foreground">
                        Rule {queueIndex! + 1} of {queue!.length}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm" variant="outline" className="flex-1"
                          disabled={!prevUuid}
                          onClick={() => prevUuid && goTo(prevUuid, queueIndex! - 1)}
                        >
                          ← Prev
                        </Button>
                        <Button
                          size="sm" variant="outline" className="flex-1"
                          disabled={!nextUuid}
                          onClick={() => nextUuid && goTo(nextUuid, queueIndex! + 1)}
                        >
                          Next →
                        </Button>
                      </div>
                    </div>
                  )}
                  <div
                    className={`rounded p-3 text-center font-semibold ${
                      servable
                        ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {servable ? 'Farmer sees this' : 'Farmer does NOT see this'}
                  </div>

                  <div className="space-y-1">
                    {blockingCount > 0 ? (
                      <div className="text-destructive flex items-center gap-1">
                        <ShieldAlert className="h-4 w-4" /> {blockingCount} blocking findings open
                      </div>
                    ) : (
                      <div className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> All clear
                      </div>
                    )}
                    <div>Evidence sources: {evidence?.length ?? 0}</div>
                    <div>PHI: {r.phi_days ?? <span className="text-destructive">MISSING</span>}</div>
                    <div>Dose: {r.dosage_per_acre ?? <span className="text-destructive">MISSING</span>}</div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">
                      Verified against (source) — required to approve/publish
                    </label>
                    <Textarea
                      rows={2}
                      value={verifiedAgainst}
                      onChange={(e) => setVerifiedAgainst(e.target.value)}
                      placeholder="e.g. CIB&RC label 2024, ICAR package of practices…"
                    />
                  </div>

                  {submitNotice && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>{submitNotice}</AlertDescription>
                    </Alert>
                  )}

                  {refusal && (
                    <Alert variant="destructive">
                      <AlertDescription className="whitespace-pre-wrap">{refusal}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    {!workflow ? (
                      <>
                        <Button
                          className="w-full"
                          disabled={submitForReview.isPending}
                          onClick={() => runTransition('review')}
                        >
                          {submitForReview.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          Submit for review
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          After you submit, a DIFFERENT reviewer must approve (maker-checker). For
                          AI/system-drafted rules, Bulk Approve on the Rules Console can approve
                          directly — those are system-submitted.
                        </p>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(NEXT_STATES[workflowState || 'draft'] || []).map((s) => {
                          const blockedByMakerChecker = s === 'approved' && isOwnSubmission;
                          return (
                            <Button
                              key={s}
                              size="sm"
                              variant={s === 'rejected' ? 'destructive' : 'default'}
                              disabled={transition.isPending || blockedByMakerChecker}
                              title={
                                blockedByMakerChecker
                                  ? 'You submitted this rule — a different reviewer must approve it.'
                                  : undefined
                              }
                              onClick={() => runTransition(s)}
                            >
                              {s}
                            </Button>
                          );
                        })}
                        {isOwnSubmission && (
                          <p className="text-xs text-muted-foreground w-full">
                            You submitted this rule — a different reviewer must approve it.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE-RULE SAVE CONFIRMATION */}
      <Dialog open={confirmLiveSave} onOpenChange={setConfirmLiveSave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>This rule is LIVE for farmers</DialogTitle>
            <DialogDescription>
              Saving will change what farmers receive immediately. The change is version-snapshotted,
              but there is no re-review before it goes out. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmLiveSave(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => { setConfirmLiveSave(false); saveFields(); }}
            >
              Save to live rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminAuthWrapper>
  );
};

export default RuleReview;
