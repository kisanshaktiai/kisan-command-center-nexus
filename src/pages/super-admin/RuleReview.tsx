import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminAuthWrapper } from '@/components/auth/AdminAuthWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import {
  ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Info, Pencil, Sprout, Undo2,
  ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Loader2,
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
const SELECT_FIELDS = new Set(['bee_toxicity', 'regulatory_status', 'phi_status']);
const BEE_TOXICITY_OPTIONS = ['high', 'moderate', 'low', 'safe'];
const REGULATORY_OPTIONS = ['approved', 'restricted', 'unknown'];
const PHI_STATUS_OPTIONS = [
  'PHI_NOT_APPLICABLE',
  'PHI_REQUIRED_VERIFIED',
  'PHI_REQUIRED_UNVERIFIED',
  'PHI_REQUIRED_MISSING',
  'PHI_CONDITIONAL',
  'PHI_SOURCE_CONFLICT',
];
const NOTE_REQUIRED: ApprovalState[] = ['approved', 'published'];

const CRITICAL_FIELDS = [
  'active_ingredient',
  'dosage_per_acre',
  'phi_days',
  'phi_status',
  'regulatory_status',
].filter((f) => (EDITABLE_RULE_FIELDS as readonly string[]).includes(f));
const SECONDARY_FIELDS = (EDITABLE_RULE_FIELDS as readonly string[]).filter(
  (f) => !CRITICAL_FIELDS.includes(f)
);

const TIER: Record<number, { label: string; className: string }> = {
  1: { label: 'T1 · Regulatory', className: 'bg-destructive text-destructive-foreground' },
  2: { label: 'T2 · ICAR/SAU', className: 'bg-success text-success-foreground' },
  3: { label: 'T3 · Peer-reviewed', className: 'bg-primary text-primary-foreground' },
  4: { label: 'T4 · Registrant label', className: 'bg-info text-info-foreground' },
  5: { label: 'T5 · Extension', className: 'bg-muted text-muted-foreground' },
  6: { label: 'T6 · Aggregator', className: 'border border-border text-foreground' },
};

const SAFETY_LEVEL: Record<
  string,
  { className: string; text: string; shield?: boolean; bad?: boolean; warn?: boolean }
> = {
  safe: { className: 'bg-success/15 text-success border border-success/30', text: 'Safety level: SAFE' },
  caution: {
    className: 'bg-warning text-warning-foreground',
    text: 'Safety level: CAUTION — advise the farmer to follow protective measures',
    warn: true,
  },
  expert_only: {
    className: 'border border-destructive text-destructive bg-destructive/5',
    text: 'Safety level: EXPERT ONLY — this advisory requires expert supervision',
    shield: true,
    warn: true,
  },
  prohibited: {
    className: 'bg-destructive text-destructive-foreground',
    text: 'Safety level: PROHIBITED — this advisory must not reach farmers',
    shield: true,
    bad: true,
  },
};

const present = (v: unknown) =>
  v != null && !(typeof v === 'string' && v.trim() === '') && !(Array.isArray(v) && v.length === 0);

const asList = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return [];
};

const Chip: React.FC<{ children: React.ReactNode; mono?: boolean }> = ({ children, mono }) => (
  <span className={`text-xs rounded border border-border bg-muted/60 px-1.5 py-0.5 ${mono ? 'font-mono' : ''}`}>
    {children}
  </span>
);


const Muted = () => <span className="text-muted-foreground">— not set —</span>;

const Empty: React.FC<{ msg: string }> = ({ msg }) => (
  <div className="text-sm text-muted-foreground py-6 text-center">{msg}</div>
);

const SectionTitle: React.FC<{ n: number; title: string; extra?: React.ReactNode }> = ({ n, title, extra }) => (
  <div className="flex items-center gap-2">
    <span className="font-mono text-xs rounded bg-muted text-muted-foreground px-1.5 py-0.5">{n}</span>
    <CardTitle className="text-sm font-semibold">{title}</CardTitle>
    {extra}
  </div>
);

const NUM_UNIT_RE = /\d+(?:\.\d+)?\s*(?:%|ml\/L|ml|g|kg|L|ppm|\/L|\/acre)/gi;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  const [showSecondary, setShowSecondary] = useState(false);
  const [expandedClaims, setExpandedClaims] = useState<Record<string, boolean>>({});

  const secFarmer = useRef<HTMLDivElement | null>(null);
  const secFields = useRef<HTMLDivElement | null>(null);
  const secBlockers = useRef<HTMLDivElement | null>(null);
  const secEvidence = useRef<HTMLDivElement | null>(null);
  const secSafetyStrip = useRef<HTMLDivElement | null>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
  const advisoryCount = openFindings.length - blockingCount;

  /* ---- flagged-term highlighting (pure client-side string work) ---- */
  const flaggedTokens = useMemo(() => {
    const text = (findings || [])
      .filter((f) => isFindingBlocking(f))
      .map((f) => `${f.detail || ''} ${f.detected_value || ''}`)
      .join(' ');
    const found = text.match(NUM_UNIT_RE) || [];
    const farmerText = `${r?.action_text ?? ''} ${r?.organic_alternative ?? ''}`;
    const uniq = Array.from(new Set(found.map((t) => t.trim())));
    return uniq.filter((t) => t && farmerText.includes(t));
  }, [findings, r?.action_text, r?.organic_alternative]);

  const highlight = (raw: unknown): React.ReactNode => {
    const text = raw == null ? '' : String(raw);
    if (!text || flaggedTokens.length === 0) return text;
    const re = new RegExp(`(${flaggedTokens.map(escapeRe).join('|')})`, 'g');
    return text.split(re).map((part, i) =>
      flaggedTokens.includes(part) ? (
        <mark key={i} className="rounded px-1 bg-warning/30 text-foreground">{part}</mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );
  };

  const findingIsHighlighted = (f: FindingRow) => {
    if (flaggedTokens.length === 0 || !isFindingBlocking(f)) return false;
    const t = `${f.detail || ''} ${f.detected_value || ''}`;
    return flaggedTokens.some((tok) => t.includes(tok));
  };


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

  /* ---- keyboard queue navigation ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === 'j' || e.key === 'ArrowRight') && nextUuid) goTo(nextUuid, queueIndex! + 1);
      if ((e.key === 'k' || e.key === 'ArrowLeft') && prevUuid) goTo(prevUuid, queueIndex! - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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
  const evidenceCount = evidence?.length ?? 0;
  const topTier = (evidence || [])
    .map((e) => e.knowledge_sources?.authority_tier)
    .filter((t): t is number => typeof t === 'number')
    .sort((a, b) => a - b)[0];
  const phiUnverified = String(r.phi_status || '').includes('UNVERIFIED');

  const safetyKey = String(r.farmer_safety_level ?? 'safe').toLowerCase();
  const safety = SAFETY_LEVEL[safetyKey] ?? {
    className: 'bg-muted text-muted-foreground',
    text: `Safety level: ${safetyKey}`,
  };
  const contraindications = asList(r.contraindications);
  const successIndicators = asList(r.success_indicators);
  const stages = asList(r.stage_applicable);
  const seasons = asList(r.season_applicable).filter((s) => s.toUpperCase() !== 'ALL');
  const soils = asList(r.soil_type_applicable).filter((s) => s.toUpperCase() !== 'ALL');
  const rotationBits = [r.chemical_class, r.resistance_group, r.mode_of_action].filter((v) => present(v));
  const hasFireContext =
    present(r.cause) ||
    present(r.condition_code) ||
    stages.length > 0 ||
    seasons.length > 0 ||
    soils.length > 0 ||
    present(r.etl_threshold) ||
    rotationBits.length > 0;
  const toxicWord = (v: unknown) => ['high', 'moderate'].includes(String(v ?? '').toLowerCase());

  type Check = { ok: boolean; warn?: boolean; label: string; onClick: () => void };
  const checklist: Check[] = [
    {
      ok: blockingCount === 0,
      label: blockingCount === 0 ? 'No blocking findings' : `Blocking findings: ${blockingCount} open`,
      onClick: () => scrollTo(secBlockers),
    },
    {
      ok: r.dosage_per_acre != null && r.dosage_per_acre !== '',
      label: r.dosage_per_acre ? `Dose set: ${r.dosage_per_acre}` : 'Dose missing',
      onClick: () => scrollTo(secFields),
    },
    {
      ok: r.phi_days != null,
      warn: r.phi_days != null && phiUnverified,
      label:
        r.phi_days == null
          ? 'PHI missing'
          : `PHI: ${r.phi_days} days${phiUnverified ? ' (UNVERIFIED)' : ''}`,
      onClick: () => scrollTo(secFields),
    },
    {
      ok: evidenceCount > 0,
      label: evidenceCount > 0 ? `Evidence: ${evidenceCount} source(s)${topTier ? ` (T${topTier})` : ''}` : 'No evidence linked',
      onClick: () => scrollTo(secEvidence),
    },
    {
      ok: !!r.expert_approved,
      label: r.expert_approved ? 'Expert approved' : 'Expert approval pending',
      onClick: () => scrollTo(secFarmer),
    },
    {
      ok: safetyKey === 'safe',
      warn: safetyKey === 'caution' || safetyKey === 'expert_only',
      label: `Safety level: ${safetyKey}`,
      onClick: () => scrollTo(secSafetyStrip),
    },
    ...(contraindications.length > 0
      ? [
          {
            ok: false,
            warn: true,
            label: `Contraindications reviewed (${contraindications.length})`,
            onClick: () => scrollTo(secSafetyStrip),
          } as Check,
        ]
      : []),
    {
      ok: present(r.scientific_source),
      label: present(r.scientific_source) ? 'Declared source present' : 'No declared source',
      onClick: () => scrollTo(secEvidence),
    },
  ];


  const renderField = (f: string) => {
    const current = r[f];
    const isEditing = !!editing[f];
    const isBannedField = f === 'regulatory_status' && String(current).toLowerCase() === 'banned';
    const isSelect = SELECT_FIELDS.has(f);
    const isMissing = current == null || current === '';
    const critical = CRITICAL_FIELDS.includes(f);
    const options =
      f === 'bee_toxicity'
        ? BEE_TOXICITY_OPTIONS
        : f === 'regulatory_status'
          ? REGULATORY_OPTIONS
          : PHI_STATUS_OPTIONS;
    return (
      <div
        key={f}
        className={`rounded-lg border p-3 ${critical && isMissing ? 'border-warning bg-warning/5' : 'border-border'}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {f.replace(/_/g, ' ')}
          </span>
          <div className="flex items-center gap-1">
            {critical && isMissing && !isEditing && (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0">MISSING</Badge>
            )}
            {!isEditing && !isBannedField && (
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
        </div>
        {isEditing ? (
          isSelect ? (
            <Select
              value={edits[f] ? edits[f] : '__CLEAR__'}
              onValueChange={(v) => setEdits((prev) => ({ ...prev, [f]: v === '__CLEAR__' ? '' : v }))}
            >
              <SelectTrigger className="mt-1 h-8">
                <SelectValue placeholder="— clear —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__CLEAR__">— clear —</SelectItem>
                {options.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className="mt-1 h-8"
              type={NUMERIC_FIELDS.has(f) ? 'number' : 'text'}
              value={edits[f] ?? ''}
              onChange={(e) => setEdits((prev) => ({ ...prev, [f]: e.target.value }))}
            />
          )
        ) : (
          <div className="text-sm mt-1 break-words">
            {isMissing ? <Muted /> : String(current)}
          </div>
        )}
      </div>
    );
  };

  const decisionButtons = (
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
  );

  return (
    <AdminAuthWrapper requiredRole="super_admin">
      <div className="space-y-4 pb-28 lg:pb-4">
        {/* A · STICKY REVIEW HEADER */}
        <div className="sticky top-0 z-40 -mx-4 px-4 py-2 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            <Link
              to="/super-admin/governance/rules"
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Back to Rules Console"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="font-mono text-sm font-semibold truncate max-w-[16rem] md:max-w-md" title={r.rule_id}>
              {r.rule_id}
            </span>
            <Badge variant={servable ? 'success' : 'destructive'} className="shrink-0">
              {servable ? 'VISIBLE to farmer' : 'NOT visible to farmer'}
            </Badge>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" aria-label="More status">
                  <Info className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={r.is_active ? 'success' : 'secondary'}>
                    {r.is_active ? 'active' : 'inactive'}
                  </Badge>
                  {r.expert_approved && <Badge variant="default">expert-approved</Badge>}
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
              </PopoverContent>
            </Popover>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              {hasQueue && (
                <>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {queueIndex! + 1} / {queue!.length}
                    </div>
                    <div className="text-[10px] text-muted-foreground hidden md:block">
                      ← → to move between rules
                    </div>
                  </div>
                  <Button
                    size="icon" variant="outline" className="h-7 w-7"
                    disabled={!prevUuid}
                    aria-label="Previous rule"
                    onClick={() => prevUuid && goTo(prevUuid, queueIndex! - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon" variant="outline" className="h-7 w-7"
                    disabled={!nextUuid}
                    aria-label="Next rule"
                    onClick={() => nextUuid && goTo(nextUuid, queueIndex! + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {[r.crop_code, r.category, r.action_type].filter(Boolean).join(' · ') || '—'}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* MAIN */}
          <div className="lg:col-span-2 space-y-4">
            {/* 1 · FARMER MESSAGE */}
            <Card ref={secFarmer as any} className="scroll-mt-20">
              <CardHeader className="p-4 pb-2">
                <SectionTitle n={1} title="Farmer message" />
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sprout className="h-3.5 w-3.5" /> Farmer receives:
                </div>
                {r.action_text ? (
                  <div className="rounded-2xl border bg-accent/40 p-4 space-y-3 max-w-[70ch]">
                    <div className="whitespace-pre-wrap text-base leading-relaxed">
                      {highlightedAction}
                    </div>
                    {r.reason_text && (
                      <div className="rounded-xl bg-background/60 border p-3">
                        <h3 className="text-xs font-semibold text-muted-foreground mb-1">
                          Why (explanation to farmer)
                        </h3>
                        <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {r.reason_text}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive max-w-[70ch]">
                    No farmer text — this rule cannot serve anyone.
                  </div>
                )}
                {flaggedTokens.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Highlighted values are referenced by an open blocking finding below.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 2 · SAFETY FIELDS */}
            <Card ref={secFields as any} className="scroll-mt-20">
              <CardHeader className="p-4 pb-2">
                <SectionTitle n={2} title="Safety fields" />
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CRITICAL_FIELDS.map(renderField)}
                </div>

                <div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-0 text-xs text-muted-foreground"
                    onClick={() => setShowSecondary((v) => !v)}
                  >
                    {showSecondary ? 'Hide' : 'More fields'} ({SECONDARY_FIELDS.length})
                  </Button>
                  {showSecondary && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      {SECONDARY_FIELDS.map(renderField)}
                    </div>
                  )}
                </div>

                {dirty && (
                  <div className="sticky bottom-2 z-30 flex items-center justify-end gap-2 rounded-lg border bg-background/90 backdrop-blur p-2">
                    <span className="text-xs text-muted-foreground mr-auto">unsaved changes</span>
                    <Button size="sm" variant="ghost" onClick={() => { setEdits({}); setEditing({}); }}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={onSaveClick} disabled={updateFields.isPending}>
                      {updateFields.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Save
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3 · BLOCKERS */}
            <Card ref={secBlockers as any} className="scroll-mt-20">
              <CardHeader className="p-4 pb-2">
                <SectionTitle
                  n={3}
                  title={`Blockers (${blockingCount} blocking · ${Math.max(advisoryCount, 0)} advisory)`}
                />
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
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
                    <div
                      key={f.id}
                      className={`flex gap-3 rounded-lg border p-3 ${blocking ? 'border-destructive/40' : 'border-warning/40'}`}
                    >
                      <div className={`w-1 rounded-full shrink-0 ${blocking ? 'bg-destructive' : 'bg-warning'}`} />
                      <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={blocking ? 'destructive' : 'warning'}>
                              {blocking ? 'BLOCKING' : 'ADVISORY'}
                            </Badge>
                            <span className="font-mono text-xs">{f.finding_type}</span>
                            <Badge variant="outline">{f.status}</Badge>
                            {findingIsHighlighted(f) && (
                              <span className="text-xs rounded px-1.5 py-0.5 bg-warning/30 text-foreground">
                                ↑ shown in farmer text
                              </span>
                            )}
                          </div>
                          <div className="text-sm">{f.detail}</div>
                          {(f.finding_type === 'CLAIM_OVERREACH' || f.finding_type === 'AGRONOMY_REVIEW') && (
                            <p className="text-xs text-muted-foreground">
                              Farmer-facing text (action_text / reason_text) is not editable on this page —
                              text changes go through the workflow's proposed-payload flow. Resolve this
                              finding only after the text has been corrected there.
                            </p>
                          )}
                          {(f.detected_value || f.expected_value) && (
                            <div className="text-xs font-mono text-muted-foreground">
                              {f.detected_value ?? '—'} → {f.expected_value ?? '—'}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 lg:w-80 shrink-0">
                          <Input
                            className="h-8"
                            placeholder="Resolution note…"
                            value={resolveNote[f.id] ?? ''}
                            onChange={(e) => setResolveNote((n) => ({ ...n, [f.id]: e.target.value }))}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0"
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

            {/* 4 · EVIDENCE */}
            <Card ref={secEvidence as any} className="scroll-mt-20">
              <CardHeader className="p-4 pb-2">
                <SectionTitle n={4} title="Evidence" />
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {evidenceLoading && <Skeleton className="h-16 w-full" />}
                {!evidenceLoading && (evidence?.length ?? 0) === 0 && (
                  <div className="rounded-lg border border-warning bg-warning/10 p-3 text-sm">
                    No evidence linked — verify against a source before approving.
                  </div>
                )}
                {(evidence || []).map((ev: EvidenceRow) => {
                  const src = ev.knowledge_sources;
                  const tier = src ? TIER[src.authority_tier] : undefined;
                  const expanded = !!expandedClaims[ev.id];
                  return (
                    <div key={ev.id} className="rounded-lg border p-3 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {tier && (
                          <span className={`text-xs px-2 py-0.5 rounded ${tier.className}`}>
                            {tier.label}
                          </span>
                        )}
                        <span className="text-sm font-medium truncate">{src?.title || 'Unknown source'}</span>
                        <span className="text-xs text-muted-foreground">
                          {[src?.publisher, src?.publication_year].filter(Boolean).join(' · ')}
                        </span>
                        <Badge variant="outline" className="ml-auto">{ev.evidence_role}</Badge>
                        {src?.url && (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Open source"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      {ev.claim_supported && (
                        <button
                          type="button"
                          className={`text-left text-xs text-muted-foreground w-full ${expanded ? '' : 'line-clamp-2'}`}
                          onClick={() => setExpandedClaims((s) => ({ ...s, [ev.id]: !expanded }))}
                        >
                          {ev.claim_supported}
                        </button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* HISTORY & INTERNALS */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  History &amp; internals
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
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
          <div className="hidden lg:block lg:col-span-1">
            <div className="lg:sticky lg:top-16 space-y-4">
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold">Decision</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3 text-sm">
                  <div className="space-y-1">
                    {checklist.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={c.onClick}
                        className="w-full flex items-center gap-2 text-left rounded px-1 py-1 hover:bg-muted"
                      >
                        {c.ok && !c.warn ? (
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        ) : c.warn ? (
                          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                        <span className="text-xs">{c.label}</span>
                      </button>
                    ))}
                  </div>

                  <div
                    className={`rounded p-3 text-center text-sm font-semibold ${
                      servable ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {servable ? 'Farmer sees this' : 'Farmer does NOT see this'}
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

                  {decisionButtons}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* MOBILE / TABLET STICKY DECISION BAR */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/90 backdrop-blur p-3 space-y-2">
          <div className="flex items-center gap-3 overflow-x-auto text-xs">
            {checklist.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={c.onClick}
                className="flex items-center gap-1 shrink-0 text-muted-foreground"
              >
                {c.ok && !c.warn ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : c.warn ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                )}
                {c.label}
              </button>
            ))}
          </div>
          {(refusal || submitNotice) && (
            <p className={`text-xs ${refusal ? 'text-destructive' : 'text-muted-foreground'}`}>
              {refusal || submitNotice}
            </p>
          )}
          <Textarea
            rows={1}
            value={verifiedAgainst}
            onChange={(e) => setVerifiedAgainst(e.target.value)}
            placeholder="Verified against (source)…"
          />
          {decisionButtons}
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
