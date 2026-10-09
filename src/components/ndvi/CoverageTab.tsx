import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, MapPin, AlertTriangle, CheckCircle2, Clock, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNdviCoverage, useStaleLands } from '@/hooks/useNdviAnalytics';
import { format } from 'date-fns';

interface CoverageTabProps { tenantId: string | null; }

export const CoverageTab: React.FC<CoverageTabProps> = ({ tenantId }) => {
  const { data: cov, isLoading } = useNdviCoverage(tenantId);
  const { data: stale } = useStaleLands(14, tenantId);
  const run = cov?.run;

  const completionRate = useMemo(() => {
    if (!run?.lands_processed || run.lands_failed == null) return null;
    return Math.round(((run.lands_processed - run.lands_failed) / run.lands_processed) * 100);
  }, [run]);

  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<MapPin className="h-4 w-4" />} label="Decision-grade lands (7d)"
          value={cov?.lands7 ?? 0}
          sub={`${pct(cov?.lands7 ?? 0, cov?.totalLands ?? 0)}% of ${cov?.totalLands ?? 0} active lands`}
          loading={isLoading} />
        <KpiCard icon={<MapPin className="h-4 w-4" />} label="Decision-grade lands (14d)"
          value={cov?.lands14 ?? 0}
          sub={`${pct(cov?.lands14 ?? 0, cov?.totalLands ?? 0)}% coverage`}
          loading={isLoading} />
        <KpiCard icon={<Database className="h-4 w-4" />} label="Decision-grade lands (30d)"
          value={cov?.lands30 ?? 0}
          sub={`${pct(cov?.lands30 ?? 0, cov?.totalLands ?? 0)}% coverage`}
          loading={isLoading} />
        <KpiCard icon={<Activity className="h-4 w-4" />} label="Latest run completion"
          value={completionRate == null ? '—' : `${completionRate}%`}
          sub={run ? `${run.lands_completed ?? 0} completed · ${run.lands_failed ?? 0} failed` : 'No run summary recorded'}
          loading={isLoading} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Latest pipeline run</CardTitle></CardHeader>
        <CardContent>
          {run ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <Metric label="Started" value={format(new Date(run.run_started_at), 'dd MMM yyyy, HH:mm')} />
              <Metric label="Duration" value={run.duration_seconds == null ? '—' : `${Math.round(run.duration_seconds)} s`} />
              <Metric label="Eligible / processed" value={`${run.lands_eligible ?? 0} / ${run.lands_processed ?? 0}`} />
              <Metric label="Observations written" value={String(run.observations_written ?? 0)} />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Clock className="h-4 w-4" /> No platform-level run summary is available.
            </div>
          )}
          {tenantId && (
            <p className="mt-4 text-xs text-muted-foreground">
              Run health is shown at platform scope because the canonical nightly run records tenant_id as null; coverage metrics above are scoped to the selected tenant.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Decision-grade NDVI acquisitions (last 30 days)</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cov?.daily ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11}
                tickFormatter={(d) => format(new Date(d), 'MMM d')} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6 }} />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Lands without a decision-grade observation in the last 14 days
            <Badge variant="secondary">{stale?.length ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stale && stale.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Every active land in this scope has a recent decision-grade observation.
            </div>
          ) : (
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Land</TableHead><TableHead>Crop</TableHead><TableHead className="text-right">Area (ac)</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(stale ?? []).slice(0, 100).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name ?? l.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-muted-foreground">{l.current_crop ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.area_acres == null ? '—' : Number(l.area_acres).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border bg-muted/20 p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="mt-1 font-semibold tabular-nums">{value}</div>
  </div>
);

const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; sub?: string; loading?: boolean; }>
  = ({ icon, label, value, sub, loading }) => (
  <Card><CardContent className="pt-6">
    <div className="flex items-center justify-between text-muted-foreground text-sm"><span>{label}</span>{icon}</div>
    <div className="mt-2 text-3xl font-semibold tabular-nums">{loading ? '…' : value}</div>
    {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
  </CardContent></Card>
);
