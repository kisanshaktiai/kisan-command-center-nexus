import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Sparkles, Loader2 } from 'lucide-react';
import { useNdviAnalytics, NdviRow } from '@/hooks/useNdviAnalytics';
import { classifyNdvi, HEALTH_COLOR, HEALTH_LABEL, HealthBand, dedupeAcquisitions } from '@/lib/ndvi/health';
import { AIInsightCard } from './AIInsightCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek } from 'date-fns';

export const TenantAnalyticsTab: React.FC = () => {
  const { data: rows = [], isLoading } = useNdviAnalytics(120);
  const { toast } = useToast();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);

  // Latest reading per land
  const latestPerLand = useMemo(() => {
    const map = new Map<string, NdviRow>();
    rows.forEach((r) => {
      const cur = map.get(r.land_id);
      if (!cur || r.date > cur.date) map.set(r.land_id, r);
    });
    return Array.from(map.values());
  }, [rows]);

  // Health distribution
  const healthData = useMemo(() => {
    const counts: Record<HealthBand, number> = { good: 0, moderate: 0, poor: 0, unknown: 0 };
    latestPerLand.forEach((r) => counts[classifyNdvi(r.ndvi_value)]++);
    return (Object.entries(counts) as [HealthBand, number][])
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ band: HEALTH_LABEL[k], value: v, color: HEALTH_COLOR[k] }));
  }, [latestPerLand]);

  // District rollup
  const districtRollup = useMemo(() => {
    const m = new Map<string, { district: string; state: string; sum: number; n: number }>();
    latestPerLand.forEach((r) => {
      if (!r.district || r.ndvi_value == null) return;
      const k = `${r.state ?? ''}|${r.district}`;
      const cur = m.get(k) ?? { district: r.district, state: r.state ?? '', sum: 0, n: 0 };
      cur.sum += Number(r.ndvi_value);
      cur.n += 1;
      m.set(k, cur);
    });
    return Array.from(m.values())
      .map((d) => ({ ...d, avg: d.sum / d.n }))
      .sort((a, b) => a.avg - b.avg);
  }, [latestPerLand]);

  // Crop performance (joined via lands.current_crop) — pull fresh
  const [cropData, setCropData] = useState<{ crop: string; avg: number; n: number }[]>([]);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from('lands').select('id, current_crop').limit(2000);
      if (!alive || !data) return;
      const cropMap = new Map<string, string>();
      (data as any[]).forEach((l) => l.current_crop && cropMap.set(l.id, l.current_crop));
      const acc = new Map<string, { sum: number; n: number }>();
      latestPerLand.forEach((r) => {
        const c = cropMap.get(r.land_id);
        if (!c || r.ndvi_value == null) return;
        const cur = acc.get(c) ?? { sum: 0, n: 0 };
        cur.sum += Number(r.ndvi_value);
        cur.n += 1;
        acc.set(c, cur);
      });
      setCropData(
        Array.from(acc.entries())
          .map(([crop, v]) => ({ crop, avg: v.sum / v.n, n: v.n }))
          .sort((a, b) => b.avg - a.avg)
      );
    })();
    return () => {
      alive = false;
    };
  }, [latestPerLand]);

  // Weekly seasonal trend
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
    return Array.from(m.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([wk, v]) => ({ week: wk, avg: Number((v.sum / v.n).toFixed(3)) }));
  }, [rows]);

  const tenantId = rows[0]?.tenant_id ?? null;

  const generateAI = async () => {
    if (!tenantId) {
      toast({ title: 'No tenant data available', variant: 'destructive' });
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ndvi-insights', {
        body: { mode: 'tenant', tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiResult(data);
    } catch (e: any) {
      toast({ title: 'AI insight failed', description: e.message, variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-8">Loading analytics…</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Crop health distribution (latest reading per land)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={healthData} dataKey="value" nameKey="band" innerRadius={50} outerRadius={90} label>
                  {healthData.map((e, i) => (<Cell key={i} fill={e.color} />))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Crop-wise NDVI</CardTitle></CardHeader>
          <CardContent className="h-64">
            {cropData.length === 0 ? (
              <div className="text-sm text-muted-foreground">No crop information assigned to lands yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cropData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="crop" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis domain={[0, 1]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Seasonal NDVI trend (weekly)</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(d) => format(new Date(d), 'MMM d')} />
              <YAxis domain={[0, 1]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>District rollup — low-NDVI risk zones at top</span>
            <Badge variant="outline">{districtRollup.length} districts</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead>District</TableHead>
                <TableHead className="text-right">Lands</TableHead>
                <TableHead className="text-right">Avg NDVI</TableHead>
                <TableHead>Health</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {districtRollup.map((d) => {
                const band = classifyNdvi(d.avg);
                return (
                  <TableRow key={`${d.state}|${d.district}`}>
                    <TableCell className="text-muted-foreground">{d.state || '—'}</TableCell>
                    <TableCell className="font-medium">{d.district}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.n}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.avg.toFixed(3)}</TableCell>
                    <TableCell>
                      <Badge style={{ background: HEALTH_COLOR[band], color: 'white' }}>
                        {HEALTH_LABEL[band]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI-generated tenant report</span>
            <Button onClick={generateAI} disabled={aiLoading || !tenantId} size="sm">
              {aiLoading ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating</> : 'Generate insight'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AIInsightCard result={aiResult} loading={aiLoading} />
        </CardContent>
      </Card>
    </div>
  );
};
