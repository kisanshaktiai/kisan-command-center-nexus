import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Database, Droplets, RefreshCw,
  Satellite, ShieldCheck, XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { CoverageTab } from '@/components/ndvi/CoverageTab';
import { TenantAnalyticsTab } from '@/components/ndvi/TenantAnalyticsTab';
import { LandExplorerTab } from '@/components/ndvi/LandExplorerTab';
import {
  useNdviRunSummary,
  useNdviProcessingLogs,
  useNdviTenants,
  useNdviWaterLayers,
  useSatelliteLayerConfig,
  createNdviSignedImageUrl,
} from '@/components/ndvi/NdviReadModel';

export default function NdviDataStatus() {
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const { data: tenants = [], isLoading: tenantsLoading } = useNdviTenants();
  const { data: run, isLoading: runLoading, isError: runError } = useNdviRunSummary();
  const { data: logs = [], isLoading: logsLoading } = useNdviProcessingLogs(7, tenantId);
  const { data: waterLayers = [], isLoading: waterLoading } = useNdviWaterLayers(120, tenantId);
  const { data: layerConfig = [] } = useSatelliteLayerConfig();

  const failedLogs = useMemo(
    () => logs.filter((l) => l.step_status === 'failed'),
    [logs]
  );

  const waterSummary = useMemo(() => {
    const byLayer = new Map<string, number>();
    waterLayers.forEach((r) => byLayer.set(r.layer_code, (byLayer.get(r.layer_code) ?? 0) + 1));
    const withArtifacts = waterLayers.filter((r) => !!r.image_path).length;
    const latest = waterLayers[0]?.acquisition_date ?? null;
    return {
      surface: byLayer.get('surface_water_trace') ?? 0,
      canopy: byLayer.get('canopy_moisture_signal') ?? 0,
      rows: waterLayers.length,
      withArtifacts,
      latest,
    };
  }, [waterLayers]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ predicate: ({ queryKey }) => String(queryKey[0] ?? '').startsWith('ndvi-') });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <Satellite className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Satellite / NDVI Operations</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Read-only observability over the canonical NDVI pipeline and its evidence outputs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={tenantId ?? 'all'}
            onValueChange={(value) => setTenantId(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-[220px] bg-white dark:bg-slate-900">
              <SelectValue placeholder={tenantsLoading ? 'Loading tenants…' : 'Select tenant'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tenants</SelectItem>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh data
          </Button>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/20">
        <ShieldCheck className="h-4 w-4 text-blue-600" />
        <AlertTitle>Pipeline ownership</AlertTitle>
        <AlertDescription className="text-sm">
          Satellite acquisition, raster processing, NDVI calculation, quality assessment, and water-layer generation are owned by the canonical NDVI pipeline. This portal does not trigger those jobs.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          title="Last pipeline run"
          value={runLoading ? '…' : run ? format(new Date(run.run_started_at), 'dd MMM HH:mm') : '—'}
          sub={run ? 'Platform-wide run summary' : 'No run summary recorded'}
        />
        <MetricCard
          icon={<Database className="h-4 w-4" />}
          title="Observations written"
          value={runLoading ? '…' : (run?.observations_written ?? '—')}
          sub={run ? (run.lands_processed ?? 0) + ' lands processed' : 'Canonical run data unavailable'}
        />
        <MetricCard
          icon={<Droplets className="h-4 w-4" />}
          title="Water evidence rows"
          value={waterLoading ? '…' : waterSummary.rows}
          sub={waterLoading ? 'Loading…' : waterSummary.latest ? 'Latest acquisition ' + waterSummary.latest : 'No water-layer rows'}
        />
        <MetricCard
          icon={failedLogs.length ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          title="Failed processing steps (7d)"
          value={logsLoading ? '…' : failedLogs.length}
          sub={tenantId ? 'Selected tenant scope' : 'Platform-visible log scope'}
          danger={failedLogs.length > 0}
        />
      </div>

      {runError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Run summary unavailable</AlertTitle>
          <AlertDescription>
            The portal could not read ndvi_run_summary. Analytics below may still load independently.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="coverage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="analytics">Tenant analytics</TabsTrigger>
          <TabsTrigger value="lands">Land explorer</TabsTrigger>
          <TabsTrigger value="water">Water intelligence</TabsTrigger>
          <TabsTrigger value="logs">Processing logs</TabsTrigger>
        </TabsList>

        <TabsContent value="coverage"><CoverageTab tenantId={tenantId} /></TabsContent>
        <TabsContent value="analytics"><TenantAnalyticsTab tenantId={tenantId} /></TabsContent>
        <TabsContent value="lands"><LandExplorerTab tenantId={tenantId} /></TabsContent>
        <TabsContent value="water"><WaterIntelligenceTab rows={waterLayers} config={layerConfig} loading={waterLoading} /></TabsContent>
        <TabsContent value="logs"><ProcessingLogsTab logs={logs} loading={logsLoading} /></TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  icon, title, value, sub, danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  sub: string;
  danger?: boolean;
}) {
  return (
    <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{title}</span>
          <span className={danger ? 'text-rose-500' : 'text-primary'}>{icon}</span>
        </div>
        <div className={danger ? 'mt-2 text-3xl font-semibold tabular-nums text-rose-600' : 'mt-2 text-3xl font-semibold tabular-nums'}>
          {value}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

type WaterRow = {
  tenant_id: string;
  land_id: string;
  scene_id: string;
  acquisition_date: string;
  acquisition_time: string | null;
  layer_code: string;
  value_mean: number | null;
  valid_fraction: number | null;
  effective_pixel_count: number | null;
  image_path: string | null;
  evidence_json: Record<string, unknown> | null;
  provenance_json: Record<string, unknown> | null;
  status: string | null;
};

function WaterIntelligenceTab({ rows, config, loading }: { rows: WaterRow[]; config: Array<{ layer_code: string; value_min: number; value_max: number; evidence_min: number | null; source: string | null }>; loading: boolean }) {
  const surface = rows.filter((r) => r.layer_code === 'surface_water_trace').length;
  const canopy = rows.filter((r) => r.layer_code === 'canopy_moisture_signal').length;
  const artifacts = rows.filter((r) => !!r.image_path).length;
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(rows.filter((r) => !!r.image_path).slice(0, 100).map(async (r) => {
        const key = r.tenant_id + ':' + r.land_id + ':' + r.scene_id + ':' + r.layer_code;
        try { return [key, await createNdviSignedImageUrl(r.image_path)] as const; }
        catch { return [key, null] as const; }
      }));
      if (!cancelled) setImageUrls(Object.fromEntries(entries.filter((e): e is [string, string] => !!e[1])));
    })();
    return () => { cancelled = true; };
  }, [rows]);

  return (
    <div className="space-y-6">
      <Alert>
        <Droplets className="h-4 w-4" />
        <AlertTitle>Observed spectral evidence</AlertTitle>
        <AlertDescription>
          Surface water trace and canopy moisture signal are stored as observational evidence. This view deliberately does not convert either layer into a water-stress diagnosis or agronomic recommendation.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={<Droplets className="h-4 w-4" />} title="Surface water trace rows" value={loading ? '…' : surface} sub="MNDWI evidence" />
        <MetricCard icon={<Activity className="h-4 w-4" />} title="Canopy moisture rows" value={loading ? '…' : canopy} sub="NDMI evidence" />
        <MetricCard icon={<Satellite className="h-4 w-4" />} title="Stored image artifacts" value={loading ? '…' : artifacts} sub="Path recorded by pipeline" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pipeline presentation configuration</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {config.map((cfg) => (
            <div key={cfg.layer_code} className="rounded-lg border p-3 text-sm">
              <div className="font-medium">{cfg.layer_code}</div>
              <div className="mt-1 text-xs text-muted-foreground">Range {cfg.value_min} to {cfg.value_max}{cfg.evidence_min == null ? '' : ' · evidence cutoff ' + cfg.evidence_min}</div>
              <div className="mt-1 text-xs text-muted-foreground">{cfg.source ?? 'Pipeline configuration'}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent water-layer observations</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="py-8 text-sm text-muted-foreground">Loading water evidence…</div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground">No water-layer observations available for this scope.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Land</TableHead><TableHead>Scene</TableHead><TableHead>Layer</TableHead>
                <TableHead className="text-right">Mean</TableHead><TableHead className="text-right">Valid fraction</TableHead><TableHead>Status</TableHead><TableHead>Artifact</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.slice(0, 200).map((r) => (
                  <TableRow key={r.tenant_id + ':' + r.land_id + ':' + r.scene_id + ':' + r.layer_code}>
                    <TableCell className="whitespace-nowrap">{r.acquisition_date}</TableCell>
                    <TableCell className="font-mono text-xs">{r.land_id.slice(0, 10)}</TableCell>
                    <TableCell className="font-mono text-xs max-w-48 truncate">{r.scene_id}</TableCell>
                    <TableCell>{r.layer_code}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.value_mean == null ? '—' : Number(r.value_mean).toFixed(3)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.valid_fraction == null ? '—' : Number(r.valid_fraction).toFixed(3)}</TableCell>
                    <TableCell><Badge variant={r.status === 'observed' ? 'success' : 'secondary'}>{r.status ?? '—'}</Badge></TableCell>
                    <TableCell>
                      {(() => {
                        const key = r.tenant_id + ':' + r.land_id + ':' + r.scene_id + ':' + r.layer_code;
                        return imageUrls[key] ? (
                          <a href={imageUrls[key]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            <Badge variant="outline">view</Badge>
                          </a>
                        ) : <Badge variant="outline">{r.image_path ? 'stored' : 'not stored'}</Badge>;
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type LogRow = {
  id: string;
  processing_step: string;
  step_status: string;
  tenant_id: string | null;
  land_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
};

function ProcessingLogsTab({ logs, loading }: { logs: LogRow[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Canonical pipeline processing logs — last 7 days</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <div className="py-8 text-sm text-muted-foreground">Loading processing logs…</div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-sm text-muted-foreground">No processing logs available for this scope.</div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Started</TableHead><TableHead>Step</TableHead><TableHead>Status</TableHead><TableHead>Tenant</TableHead>
              <TableHead>Land</TableHead><TableHead className="text-right">Duration</TableHead><TableHead>Error</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {logs.slice(0, 200).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs">{l.started_at ? format(new Date(l.started_at), 'dd MMM HH:mm:ss') : '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{l.processing_step}</TableCell>
                  <TableCell>
                    <Badge variant={l.step_status === 'failed' ? 'destructive' : l.step_status === 'completed' ? 'success' : 'secondary'}>
                      {l.step_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.tenant_id ? l.tenant_id.slice(0, 8) : 'platform'}</TableCell>
                  <TableCell className="font-mono text-xs">{l.land_id ? l.land_id.slice(0, 8) : '—'}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{l.duration_ms == null ? '—' : l.duration_ms + ' ms'}</TableCell>
                  <TableCell className="max-w-80 truncate text-xs text-rose-600">{l.error_message ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
