import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useDecisionRuleDetail,
  useRulePerformance,
  useRuleVersions,
  useRuleConflicts,
  useRuleLineage,
  useRuleApproval,
} from '@/hooks/useDecisionRules';
import { useRollbackToVersion } from '@/hooks/useGovernanceMutations';
import { Button } from '@/components/ui/button';
import { Undo2 } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  ruleUuid: string | null;
  ruleTextId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const sevColor = (s: string) =>
  s === 'critical' ? 'destructive' : s === 'warn' ? 'warning' : 'secondary';

export function RuleDetailDrawer({ ruleUuid, ruleTextId, open, onOpenChange }: Props) {
  const { data: rule } = useDecisionRuleDetail(ruleUuid);
  const { data: perf } = useRulePerformance(ruleTextId);
  const { data: versions } = useRuleVersions(ruleUuid);
  const { data: conflicts } = useRuleConflicts(ruleUuid);
  const { data: lineage } = useRuleLineage(ruleUuid);
  const { data: approvals } = useRuleApproval(ruleUuid);
  const rollback = useRollbackToVersion();

  const totalFired = (perf || []).reduce((s, p: any) => s + (p.times_fired || 0), 0);
  const avgSuccess =
    perf && perf.length
      ? (perf.reduce((s, p: any) => s + Number(p.success_rate || 0), 0) / perf.length).toFixed(1)
      : '—';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-base">{rule?.rule_id || '...'}</span>
            {rule?.is_active ? (
              <Badge variant="success">active</Badge>
            ) : (
              <Badge variant="secondary">inactive</Badge>
            )}
            {rule?.expert_approved && <Badge variant="default">expert-approved</Badge>}
            {(conflicts?.length ?? 0) > 0 && (
              <Badge variant="destructive">{conflicts!.length} conflicts</Badge>
            )}
          </DrawerTitle>
          <DrawerDescription>
            {rule?.crop_code} · {rule?.category} · {rule?.action_type}
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="px-6 pb-8 max-h-[80vh]">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
              <TabsTrigger value="conflicts">Conflicts ({conflicts?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="lineage">Lineage ({lineage?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="versions">Versions ({versions?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="approval">Approval ({approvals?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <Field label="IPM Level" value={rule?.ipm_level} />
                <Field label="Bee Toxicity" value={rule?.bee_toxicity} />
                <Field label="Regulatory" value={rule?.regulatory_status} />
                <Field label="Confidence" value={rule?.confidence_score} />
                <Field label="PHI Days" value={rule?.phi_days} />
                <Field label="REI Hours" value={rule?.reentry_interval_hours} />
                <Field label="Version" value={rule?.rule_version} />
                <Field label="Updated" value={rule?.updated_at && format(new Date(rule.updated_at), 'PP p')} />
              </div>
              {rule?.cause && (
                <Card><CardHeader><CardTitle className="text-sm">Cause</CardTitle></CardHeader>
                  <CardContent className="text-sm">{rule.cause}</CardContent></Card>
              )}
              {rule?.reason_text && (
                <Card><CardHeader><CardTitle className="text-sm">Reason</CardTitle></CardHeader>
                  <CardContent className="text-sm">{rule.reason_text}</CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="telemetry">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Stat label="Tenants" value={perf?.length ?? 0} />
                <Stat label="Total Fired" value={totalFired} />
                <Stat label="Avg Success %" value={avgSuccess} />
              </div>
              {perf && perf.length > 0 ? (
                <div className="space-y-2">
                  {perf.map((p: any) => (
                    <div key={p.id} className="border rounded p-3 text-sm grid grid-cols-4 gap-2">
                      <div className="font-mono text-xs col-span-2 truncate">{p.tenant_id}</div>
                      <div>fired: {p.times_fired}</div>
                      <div>success: {Number(p.success_rate || 0).toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty msg="No telemetry recorded yet." />
              )}
            </TabsContent>

            <TabsContent value="conflicts">
              {conflicts && conflicts.length > 0 ? (
                <div className="space-y-2">
                  {conflicts.map((c: any) => (
                    <Card key={c.id}>
                      <CardContent className="pt-4 text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={sevColor(c.severity) as any}>{c.severity}</Badge>
                          <span className="font-medium">{c.conflict_type}</span>
                          {c.resolved && <Badge variant="success">resolved</Badge>}
                        </div>
                        <div className="font-mono text-xs">A: {c.rule_a_id} · B: {c.rule_b_id}</div>
                        {c.conflict_details && (
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(c.conflict_details, null, 2)}
                          </pre>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : <Empty msg="No conflicts detected." />}
            </TabsContent>

            <TabsContent value="lineage">
              {lineage && lineage.length > 0 ? (
                <ol className="border-l-2 border-border ml-3 space-y-3">
                  {lineage.map((l: any) => (
                    <li key={l.id} className="ml-4 relative">
                      <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-primary" />
                      <div className="text-sm">
                        <Badge variant="outline">{l.relation_type}</Badge>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {format(new Date(l.created_at), 'PP')}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {l.parent_rule_id === ruleUuid ? `→ ${l.child_rule_id}` : `← ${l.parent_rule_id}`}
                      </div>
                      {l.notes && <div className="text-sm mt-1">{l.notes}</div>}
                    </li>
                  ))}
                </ol>
              ) : <Empty msg="No lineage records." />}
            </TabsContent>

            <TabsContent value="versions">
              {versions && versions.length > 0 ? (
                <div className="space-y-2">
                  {versions.map((v: any, idx: number) => (
                    <Card key={v.id}>
                      <CardContent className="pt-4 text-sm">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="default">v{v.version_number}</Badge>
                          <Badge variant="outline">{v.change_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(v.created_at), 'PP p')}
                          </span>
                          {idx > 0 && (
                            <Button
                              size="sm" variant="outline" className="ml-auto h-7"
                              disabled={rollback.isPending}
                              onClick={() => rollback.mutate({ versionId: v.id, notes: `Rollback from v${versions[0].version_number} to v${v.version_number}` })}
                            >
                              <Undo2 className="h-3 w-3 mr-1" />
                              Rollback to this
                            </Button>
                          )}
                        </div>
                        {v.change_reason && <div className="text-xs">{v.change_reason}</div>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : <Empty msg="No version history yet." />}
            </TabsContent>

            <TabsContent value="approval">
              {approvals && approvals.length > 0 ? (
                <div className="space-y-2">
                  {approvals.map((a: any) => (
                    <Card key={a.id}>
                      <CardContent className="pt-4 text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge>{a.state}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(a.updated_at), 'PP p')}
                          </span>
                        </div>
                        {a.agronomist_notes && <div>{a.agronomist_notes}</div>}
                        {a.rejection_reason && (
                          <div className="text-destructive">Rejected: {a.rejection_reason}</div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : <Empty msg="No approval workflow entries." />}
            </TabsContent>

            <TabsContent value="json">
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-[60vh]">
                {JSON.stringify(rule?.conditions_json ?? {}, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

const Field = ({ label, value }: { label: string; value: any }) => (
  <div className="border rounded p-2">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-medium">{value ?? '—'}</div>
  </div>
);

const Stat = ({ label, value }: { label: string; value: any }) => (
  <Card><CardContent className="pt-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </CardContent></Card>
);

const Empty = ({ msg }: { msg: string }) => (
  <div className="text-sm text-muted-foreground py-8 text-center">{msg}</div>
);
