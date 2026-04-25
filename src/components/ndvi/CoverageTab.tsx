import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNdviCoverage, useStaleLands } from '@/hooks/useNdviAnalytics';
import { format } from 'date-fns';

export const CoverageTab: React.FC = () => {
  const { data: cov, isLoading } = useNdviCoverage();
  const { data: stale } = useStaleLands(14);

  const successRate = useMemo(() => {
    if (!cov?.pipelineRuns7) return 0;
    return Math.round((cov.pipelineSuccess7 / cov.pipelineRuns7) * 100);
  }, [cov]);

  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<MapPin className="h-4 w-4" />}
          label="Lands w/ NDVI (7d)"
          value={cov?.lands7 ?? 0}
          sub={`${pct(cov?.lands7 ?? 0, cov?.totalLands ?? 0)}% of ${cov?.totalLands ?? 0} lands`}
          loading={isLoading}
        />
        <KpiCard
          icon={<MapPin className="h-4 w-4" />}
          label="Lands w/ NDVI (14d)"
          value={cov?.lands14 ?? 0}
          sub={`${pct(cov?.lands14 ?? 0, cov?.totalLands ?? 0)}% coverage`}
          loading={isLoading}
        />
        <KpiCard
          icon={<MapPin className="h-4 w-4" />}
          label="Lands w/ NDVI (30d)"
          value={cov?.lands30 ?? 0}
          sub={`${pct(cov?.lands30 ?? 0, cov?.totalLands ?? 0)}% coverage`}
          loading={isLoading}
        />
        <KpiCard
          icon={<Activity className="h-4 w-4" />}
          label="Pipeline success (7d)"
          value={`${successRate}%`}
          sub={`${cov?.pipelineSuccess7 ?? 0} / ${cov?.pipelineRuns7 ?? 0} runs`}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily NDVI ingestion (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cov?.daily ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(d) => format(new Date(d), 'MMM d')}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 6,
                }}
              />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Stale lands (no NDVI in last 14 days)
            <Badge variant="secondary">{stale?.length ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stale && stale.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              All lands have recent NDVI data.
            </div>
          ) : (
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Land</TableHead>
                    <TableHead>Crop</TableHead>
                    <TableHead className="text-right">Area (ac)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stale ?? []).slice(0, 50).map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name ?? l.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-muted-foreground">{l.current_crop ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.area_acres ? Number(l.area_acres).toFixed(2) : '—'}
                      </TableCell>
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

const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
}> = ({ icon, label, value, sub, loading }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between text-muted-foreground text-sm">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">
        {loading ? '…' : value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </CardContent>
  </Card>
);
