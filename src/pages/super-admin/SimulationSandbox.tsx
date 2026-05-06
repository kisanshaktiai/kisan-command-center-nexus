import React, { useState } from 'react';
import { AdminAuthWrapper } from '@/components/auth/AdminAuthWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useSimulateRule } from '@/hooks/useGovernanceMutations';
import { Play, FlaskConical } from 'lucide-react';

export default function SimulationSandbox() {
  const [ruleId, setRuleId] = useState('');
  const [crop, setCrop] = useState('');
  const [stage, setStage] = useState('');
  const [observation, setObservation] = useState('');
  const [plantPart, setPlantPart] = useState('');
  const [extra, setExtra] = useState('{}');

  const sim = useSimulateRule();

  const run = () => {
    let extraObj: Record<string, any> = {};
    try { extraObj = JSON.parse(extra || '{}'); } catch { /* ignore */ }
    sim.mutate({
      ruleId,
      sampleInput: {
        crop_code: crop || undefined,
        stage: stage || undefined,
        observation: observation || undefined,
        plant_part: plantPart || undefined,
        ...extraObj,
      },
    });
  };

  const result = sim.data as any;

  return (
    <AdminAuthWrapper requiredRole="super_admin">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Simulation Sandbox</h1>
            <p className="text-sm text-muted-foreground">Dry-run a rule against arbitrary input. Read-only — no side effects.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Input</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Rule UUID</Label>
                <Input value={ruleId} onChange={e => setRuleId(e.target.value)} placeholder="00000000-…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Crop Code</Label><Input value={crop} onChange={e => setCrop(e.target.value)} /></div>
                <div><Label>Stage</Label><Input value={stage} onChange={e => setStage(e.target.value)} /></div>
                <div><Label>Observation</Label><Input value={observation} onChange={e => setObservation(e.target.value)} /></div>
                <div><Label>Plant Part</Label><Input value={plantPart} onChange={e => setPlantPart(e.target.value)} /></div>
              </div>
              <div>
                <Label>Extra context (JSON)</Label>
                <Textarea value={extra} onChange={e => setExtra(e.target.value)} rows={6} className="font-mono text-xs" />
              </div>
              <Button onClick={run} disabled={!ruleId || sim.isPending}>
                <Play className="h-4 w-4 mr-2" />
                {sim.isPending ? 'Simulating…' : 'Run Simulation'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Result
                {result && (
                  <Badge variant={result.matched ? 'success' : 'destructive'}>
                    {result.matched ? 'MATCH' : 'NO MATCH'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sim.error && <div className="text-destructive text-sm">{(sim.error as any).message}</div>}
              {result ? (
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[60vh]">
                  {JSON.stringify(result, null, 2)}
                </pre>
              ) : (
                <div className="text-sm text-muted-foreground py-8 text-center">Run a simulation to see results.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminAuthWrapper>
  );
}
