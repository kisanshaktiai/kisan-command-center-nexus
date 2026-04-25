import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Search, Sparkles, Loader2, AlertTriangle, Info } from 'lucide-react';
import { useNdviAnalytics, NdviRow } from '@/hooks/useNdviAnalytics';
import { classifyNdvi, HEALTH_COLOR, HEALTH_LABEL, dedupeAcquisitions, movingAverage, zScores, buildAdvisory } from '@/lib/ndvi/health';
import { AIInsightCard } from './AIInsightCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';

export const LandExplorerTab: React.FC = () => {
  const { data: rows = [] } = useNdviAnalytics(120);
  const [search, setSearch] = useState('');
  const [selectedLandId, setSelectedLandId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const { toast } = useToast();

  // group by land
  const byLand = useMemo(() => {
    const m = new Map<string, NdviRow[]>();
    rows.forEach((r) => {
      if (!m.has(r.land_id)) m.set(r.land_id, []);
      m.get(r.land_id)!.push(r);
    });
    return m;
  }, [rows]);

  const lands = useMemo(() => {
    const out: {
      land_id: string;
      name: string;
      farmer: string;
      village: string;
      district: string;
      area: number | null;
      latest: number | null;
      latestDate: string | null;
      daysSince: number | null;
    }[] = [];
    byLand.forEach((arr, land_id) => {
      const sorted = [...arr].sort((a, b) => b.date.localeCompare(a.date));
      const top = sorted[0];
      out.push({
        land_id,
        name: top.land_name ?? land_id.slice(0, 8),
        farmer: top.farmer_name || top.farmer_code || '—',
        village: top.village ?? '—',
        district: top.district ?? '—',
        area: top.area_acres,
        latest: top.ndvi_value == null ? null : Number(top.ndvi_value),
        latestDate: top.date,
        daysSince: top.date ? differenceInDays(new Date(), new Date(top.date)) : null,
      });
    });
    const q = search.toLowerCase().trim();
    return q
      ? out.filter((l) =>
          [l.name, l.farmer, l.village, l.district].some((s) => s.toLowerCase().includes(q))
        )
      : out;
  }, [byLand, search]);

  const selectedSeries = useMemo(() => {
    if (!selectedLandId) return [];
    const arr = byLand.get(selectedLandId) ?? [];
    const dedup = dedupeAcquisitions(
      arr.map((r) => ({ date: r.date, ndvi_value: r.ndvi_value == null ? null : Number(r.ndvi_value) }))
    );
    const values = dedup.map((p) => Number(p.ndvi_value));
    const ma = movingAverage(values, 3);
    const zs = zScores(values);
    return dedup.map((p, i) => ({
      date: p.date,
      ndvi: Number(p.ndvi_value),
      ma3: Number(ma[i]?.toFixed(3)),
      anomaly: Math.abs(zs[i] ?? 0) > 2,
    }));
  }, [selectedLandId, byLand]);

  const advisory = useMemo(() => {
    if (!selectedLandId) return [];
    const arr = byLand.get(selectedLandId) ?? [];
    return buildAdvisory(arr.map((r) => ({ date: r.date, ndvi_value: r.ndvi_value == null ? null : Number(r.ndvi_value) })));
  }, [selectedLandId, byLand]);

  const generateAI = async () => {
    if (!selectedLandId) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ndvi-insights', {
        body: { mode: 'land', land_id: selectedLandId },
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,1.2fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lands ({lands.length})</CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by land, farmer, village, district…"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="max-h-[600px] overflow-auto p-0">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>Land / farmer</TableHead>
                <TableHead className="text-right">NDVI</TableHead>
                <TableHead className="text-right">Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lands.map((l) => {
                const band = classifyNdvi(l.latest);
                const selected = l.land_id === selectedLandId;
                return (
                  <TableRow
                    key={l.land_id}
                    className={`cursor-pointer ${selected ? 'bg-primary/10' : ''}`}
                    onClick={() => { setSelectedLandId(l.land_id); setAiResult(null); }}
                  >
                    <TableCell>
                      <div className="font-medium text-sm">{l.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.farmer} · {l.village}, {l.district}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge style={{ background: HEALTH_COLOR[band], color: 'white' }} className="tabular-nums">
                        {l.latest == null ? '—' : l.latest.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                      {l.daysSince ?? '—'}d
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {!selectedLandId ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground text-sm">
              Select a land on the left to inspect its NDVI timeline.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>NDVI timeline (true acquisitions)</span>
                  <Badge variant="outline">{selectedSeries.length} acquisitions</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(d) => format(new Date(d), 'MMM d')} />
                    <YAxis domain={[0, 1]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <ReferenceLine y={0.5} stroke="hsl(142 71% 45%)" strokeDasharray="3 3" label={{ value: 'Good', fontSize: 10, fill: 'hsl(142 71% 45%)' }} />
                    <ReferenceLine y={0.3} stroke="hsl(38 92% 50%)" strokeDasharray="3 3" label={{ value: 'Moderate', fontSize: 10, fill: 'hsl(38 92% 50%)' }} />
                    <Line type="monotone" dataKey="ndvi" stroke="hsl(var(--primary))" strokeWidth={2} dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      return <circle cx={cx} cy={cy} r={payload.anomaly ? 5 : 3} fill={payload.anomaly ? 'hsl(0 84% 60%)' : 'hsl(var(--primary))'} />;
                    }} />
                    <Line type="monotone" dataKey="ma3" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Rule-based advisory</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {advisory.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No issues detected from NDVI series.</div>
                ) : advisory.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-md border p-3">
                    {a.severity === 'critical' ? <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                      : a.severity === 'warn' ? <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                      : <Info className="h-4 w-4 text-primary mt-0.5" />}
                    <div>
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-muted-foreground">{a.detail}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI farmer report</span>
                  <Button onClick={generateAI} disabled={aiLoading} size="sm">
                    {aiLoading ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating</> : 'Generate insight'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AIInsightCard result={aiResult} loading={aiLoading} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};
