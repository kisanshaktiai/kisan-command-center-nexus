import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { useNdviAnalytics } from '@/hooks/useNdviAnalytics';
import { format, startOfWeek } from 'date-fns';

interface TenantAnalyticsTabProps { tenantId: string | null; }

export const TenantAnalyticsTab: React.FC<TenantAnalyticsTabProps> = ({ tenantId }) => {
  const { data: rows = [], isLoading, isError } = useNdviAnalytics(120, tenantId);

  const latestPerLand = useMemo(() => {
    const map = new Map<string, typeof rows[number]>();
    rows.forEach((r) => {
      const cur = map.get(r.land_id);
      const rTime = r.acquisition_time ?? '';
      const cTime = cur?.acquisition_time ?? '';
      if (!cur || r.date > cur.date || (r.date === cur.date && rTime > cTime)) map.set(r.land_id, r);
    });
    return Array.from(map.values());
  }, [rows]);

  const evidenceData = useMemo(() => {
    const counts = new Map<string, number>();
    latestPerLand.forEach((r) => {
      const key = r.evidence_confidence ?? 'unrated';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([level, value]) => ({ level, value }));
  }, [latestPerLand]);

  const weeklyTrend = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    rows.forEach((r) => {
      if (r.ndvi_value == null) return;
      const wk = format(startOfWeek(new Date(r.date)), 'yyyy-MM-dd');
      const cur = m.get(wk) ?? { sum: 0, n: 0 };
      cur.sum += Number(r.ndvi_value);
      cur.n += 1;
      m.set(wk, cur);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, v]) => ({ week, avg: Number((v.sum / v.n).toFixed(3)) }));
  }, [rows]);

  if (isLoading) return <div className="text-sm text-muted-foreground py-8">Loading analytics…</div>;
  if (isError) return <div className="text-sm text-destructive py-8">Unable to load canonical NDVI analytics for this scope.</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evidence confidence — latest decision-grade observation per land</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {evidenceData.length === 0 ? (
            <div className="text-sm text-muted-foreground">No decision-grade observations in this scope.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evidenceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="level" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">NDVI weekly observation trend</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11}
                tickFormatter={(d) => format(new Date(d), 'MMM d')} />
              <YAxis domain={[0, 1]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Current decision-grade scope</CardTitle>
          <Badge variant="outline">{latestPerLand.length} lands</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            This dashboard reports measured NDVI and evidence metadata only. Agronomic interpretation and treatment decisions remain outside this analytics view.
          </p>
          {latestPerLand.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Mean NDVI across the selected scope: {(
                latestPerLand.reduce((sum, r) => sum + (r.ndvi_value == null ? 0 : Number(r.ndvi_value)), 0) /
                latestPerLand.filter((r) => r.ndvi_value != null).length
              ).toFixed(3)} from {latestPerLand.filter((r) => r.ndvi_value != null).length} latest land observations.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
