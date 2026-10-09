import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Search, Info } from 'lucide-react';
import { useNdviAnalytics } from '@/hooks/useNdviAnalytics';
import { createNdviSignedImageUrl, useNdviObservationMedia } from '@/components/ndvi/NdviReadModel';
import { format, differenceInDays } from 'date-fns';

interface LandExplorerTabProps { tenantId: string | null; }

const evidenceClass = (value: string | null) => {
  switch (value) {
    case 'high': return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
    case 'medium': return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
    case 'low': return 'bg-rose-500/15 text-rose-700 border-rose-500/30';
    case 'insufficient': return 'bg-slate-500/15 text-slate-700 border-slate-500/30';
    default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  }
};

export const LandExplorerTab: React.FC<LandExplorerTabProps> = ({ tenantId }) => {
  const { data: rows = [], isLoading, isError } = useNdviAnalytics(120, tenantId);
  const [search, setSearch] = useState('');
  const [selectedLandId, setSelectedLandId] = useState<string | null>(null);
  const { data: media = [] } = useNdviObservationMedia(selectedLandId, 120);
  const [signedImages, setSignedImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(media.filter((m) => !!m.image_url).map(async (m) => {
        try { return [m.scene_id, await createNdviSignedImageUrl(m.image_url)] as const; }
        catch { return [m.scene_id, null] as const; }
      }));
      if (!cancelled) setSignedImages(Object.fromEntries(entries.filter((e): e is [string, string] => !!e[1])));
    })();
    return () => { cancelled = true; };
  }, [media]);

  const byLand = useMemo(() => {
    const m = new Map<string, typeof rows>();
    rows.forEach((r) => {
      const arr = m.get(r.land_id) ?? [];
      arr.push(r);
      m.set(r.land_id, arr);
    });
    return m;
  }, [rows]);

  const lands = useMemo(() => {
    const out: Array<{ land_id: string; name: string; area: number | null; latest: typeof rows[number] }> = [];
    byLand.forEach((arr, land_id) => {
      const latest = [...arr].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.acquisition_time ?? '').localeCompare(a.acquisition_time ?? '');
      })[0];
      if (latest) out.push({ land_id, name: latest.land_name ?? land_id.slice(0, 8), area: latest.area_acres, latest });
    });
    const q = search.toLowerCase().trim();
    return q ? out.filter((l) => (l.name + ' ' + l.land_id).toLowerCase().includes(q)) : out;
  }, [byLand, search]);

  const selectedSeries = useMemo(() => {
    if (!selectedLandId) return [];
    const arr = [...(byLand.get(selectedLandId) ?? [])].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.acquisition_time ?? '').localeCompare(b.acquisition_time ?? '');
    });
    return arr.map((r) => ({ date: r.date, ndvi: r.ndvi_value == null ? null : Number(r.ndvi_value) }));
  }, [selectedLandId, byLand]);

  const selectedRows = useMemo(() => [...(byLand.get(selectedLandId ?? '') ?? [])].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.acquisition_time ?? '').localeCompare(a.acquisition_time ?? '');
  }), [selectedLandId, byLand]);

  if (isLoading) return <div className="text-sm text-muted-foreground py-8">Loading land observations…</div>;
  if (isError) return <div className="text-sm text-destructive py-8">Unable to load canonical NDVI observations for this scope.</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,1.35fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lands ({lands.length})</CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search by land name or ID…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="max-h-[650px] overflow-auto p-0">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>Land</TableHead>
                <TableHead className="text-right">NDVI</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead className="text-right">Age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lands.map((l) => {
                const selected = l.land_id === selectedLandId;
                const age = differenceInDays(new Date(), new Date(l.latest.date));
                return (
                  <TableRow key={l.land_id} className={selected ? 'cursor-pointer bg-primary/10' : 'cursor-pointer'} onClick={() => setSelectedLandId(l.land_id)}>
                    <TableCell>
                      <div className="font-medium text-sm">{l.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.land_id.slice(0, 12)} · {l.area == null ? 'area —' : l.area.toFixed(2) + ' ac'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{l.latest.ndvi_value == null ? '—' : Number(l.latest.ndvi_value).toFixed(3)}</TableCell>
                    <TableCell><Badge variant="outline" className={evidenceClass(l.latest.evidence_confidence)}>{l.latest.evidence_confidence ?? 'unrated'}</Badge></TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums">{age}d</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {!selectedLandId ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground text-sm">Select a land to inspect its canonical decision-grade observations.</CardContent></Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>NDVI timeline — acquisition identity preserved</span>
                  <Badge variant="outline">{selectedSeries.length} scenes</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(d) => format(new Date(d), 'MMM d')} />
                    <YAxis domain={[-1, 1]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="ndvi" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Canonical NDVI imagery</CardTitle></CardHeader>
              <CardContent>
                {media.filter((m) => signedImages[m.scene_id]).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pipeline imagery is available for the selected land in this period.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {media.filter((m) => signedImages[m.scene_id]).slice(0, 6).map((m) => (
                      <div key={m.scene_id} className="rounded-lg border overflow-hidden bg-muted/20">
                        <img src={signedImages[m.scene_id]} alt={"NDVI observation " + m.acquisition_date} className="w-full aspect-square object-contain bg-slate-950/5" loading="lazy" />
                        <div className="p-2 text-xs text-muted-foreground flex justify-between gap-2">
                          <span>{m.acquisition_date}</span><span className="font-mono truncate">{m.scene_id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Measurement evidence</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5 text-primary" />
                  Values below are measurement metadata from the canonical pipeline. They are not agronomic diagnosis or treatment recommendations.
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Acquisition</TableHead><TableHead>Scene</TableHead><TableHead className="text-right">NDVI</TableHead>
                      <TableHead>Evidence</TableHead><TableHead className="text-right">Quality</TableHead><TableHead className="text-right">EPC</TableHead><TableHead className="text-right">Purity</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {selectedRows.map((r) => (
                        <TableRow key={r.scene_id ?? (r.land_id + '-' + r.date + '-' + (r.acquisition_time ?? ''))}>
                          <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                          <TableCell className="font-mono text-xs max-w-48 truncate">{r.scene_id ?? '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.ndvi_value == null ? '—' : Number(r.ndvi_value).toFixed(3)}</TableCell>
                          <TableCell><Badge variant="outline" className={evidenceClass(r.evidence_confidence)}>{r.evidence_confidence ?? 'unrated'}</Badge></TableCell>
                          <TableCell className="text-right tabular-nums">{r.quality_score == null ? '—' : Number(r.quality_score).toFixed(3)}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.effective_pixel_count == null ? '—' : Number(r.effective_pixel_count).toFixed(2)}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.coverage_weighted_purity == null ? '—' : Number(r.coverage_weighted_purity).toFixed(3)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};
