import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useChemicalRegulatory, useEtlStandards, usePhiReiMatrix } from '@/hooks/useSafetyData';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

const statusColor = (s: string) =>
  /ban/i.test(s) ? 'destructive' : /restrict/i.test(s) ? 'warning' : 'secondary';

const SafetyConsole: React.FC = () => {
  const [chemSearch, setChemSearch] = useState('');
  const [pestSearch, setPestSearch] = useState('');
  const [pestCrop, setPestCrop] = useState('');
  const [phiCrop, setPhiCrop] = useState('');

  const { data: chems, isLoading: chemsLoading } = useChemicalRegulatory(chemSearch);
  const { data: etls, isLoading: etlsLoading } = useEtlStandards(pestSearch, pestCrop || null);
  const { data: phi, isLoading: phiLoading } = usePhiReiMatrix(phiCrop || null);

  const banned = chems?.filter((c: any) => /ban/i.test(c.status)).length ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Safety & Regulatory Console</h1>
        <p className="text-sm text-muted-foreground">
          Banned chemicals, ETL thresholds, PHI/REI matrix. Read-only governance view.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Banned/Restricted Chemicals</div>
            <div className="text-3xl font-bold flex items-center gap-2">
              {banned}
              {banned > 0 && <AlertTriangle className="w-5 h-5 text-destructive" />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">ETL Standards</div>
            <div className="text-3xl font-bold">{etls?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">Rules with PHI/REI</div>
            <div className="text-3xl font-bold">{phi?.length ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chemicals">
        <TabsList>
          <TabsTrigger value="chemicals">Banned Chemicals</TabsTrigger>
          <TabsTrigger value="etl">ETL Thresholds</TabsTrigger>
          <TabsTrigger value="phi">PHI / REI Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="chemicals" className="space-y-3">
          <Input
            placeholder="Search chemical name…"
            value={chemSearch}
            onChange={(e) => setChemSearch(e.target.value)}
          />
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chemical</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Regulator</TableHead>
                    <TableHead>Ban Date</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chemsLoading && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  )}
                  {chems?.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.chemical_name}</TableCell>
                      <TableCell><Badge variant={statusColor(c.status) as any}>{c.status}</Badge></TableCell>
                      <TableCell>{c.regulatory_body || '—'}</TableCell>
                      <TableCell>{c.ban_date ? format(new Date(c.ban_date), 'PP') : '—'}</TableCell>
                      <TableCell className="max-w-md text-sm">{c.reason || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="etl" className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Pest name or code" value={pestSearch} onChange={(e) => setPestSearch(e.target.value)} />
            <Input placeholder="Crop code (exact)" value={pestCrop} onChange={(e) => setPestCrop(e.target.value)} />
          </div>
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pest</TableHead>
                    <TableHead>Crop</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>ETL</TableHead>
                    <TableHead>Action Threshold</TableHead>
                    <TableHead>Sampling</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {etlsLoading && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  )}
                  {etls?.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">
                        {e.pest_name_en} <span className="text-xs text-muted-foreground font-mono">({e.pest_code})</span>
                      </TableCell>
                      <TableCell>{e.crop_code || '—'}</TableCell>
                      <TableCell>{Array.isArray(e.growth_stage) ? e.growth_stage.join(', ') : (e.growth_stage || '—')}</TableCell>
                      <TableCell>{e.etl_value} {e.etl_unit}</TableCell>
                      <TableCell>{e.action_threshold ?? '—'}</TableCell>
                      <TableCell className="text-xs">{e.sampling_method || '—'} {e.sampling_unit && `/ ${e.sampling_unit}`}</TableCell>
                      <TableCell className="text-xs">{e.icar_source || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phi" className="space-y-3">
          <Input placeholder="Filter by crop code" value={phiCrop} onChange={(e) => setPhiCrop(e.target.value)} />
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Crop</TableHead>
                    <TableHead>Active Ingredient</TableHead>
                    <TableHead>PHI (days)</TableHead>
                    <TableHead>REI (hrs)</TableHead>
                    <TableHead>Bee Tox</TableHead>
                    <TableHead>Regulatory</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phiLoading && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  )}
                  {phi?.map((r: any) => {
                    const phiHigh = (r.phi_days ?? 0) >= 14;
                    const reiHigh = (r.reentry_interval_hours ?? 0) >= 24;
                    const beeBad = /high/i.test(r.bee_toxicity || '');
                    return (
                      <TableRow key={r.rule_id}>
                        <TableCell className="font-mono text-xs">{r.rule_id}</TableCell>
                        <TableCell>{r.crop_code || '—'}</TableCell>
                        <TableCell>{r.active_ingredient || '—'}</TableCell>
                        <TableCell>
                          {r.phi_days ?? '—'}
                          {phiHigh && <Badge className="ml-2" variant="warning">long</Badge>}
                        </TableCell>
                        <TableCell>
                          {r.reentry_interval_hours ?? '—'}
                          {reiHigh && <Badge className="ml-2" variant="warning">long</Badge>}
                        </TableCell>
                        <TableCell>
                          {r.bee_toxicity || '—'}
                          {beeBad && <Badge className="ml-2" variant="destructive">⚠</Badge>}
                        </TableCell>
                        <TableCell>{r.regulatory_status || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SafetyConsole;
