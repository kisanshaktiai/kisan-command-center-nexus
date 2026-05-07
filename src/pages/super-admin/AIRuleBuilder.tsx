import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Send, AlertTriangle } from 'lucide-react';
import { useDraftRule, useSubmitDraftAsProposal, type RuleDraft } from '@/hooks/useGovernanceAI';

export default function AIRuleBuilder() {
  const [crop, setCrop] = useState('');
  const [stage, setStage] = useState('');
  const [observation, setObservation] = useState('');
  const [plantPart, setPlantPart] = useState('');
  const [intent, setIntent] = useState('');
  const [draft, setDraft] = useState<RuleDraft | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [notes, setNotes] = useState('');

  const draftMut = useDraftRule();
  const submitMut = useSubmitDraftAsProposal();

  const handleDraft = async () => {
    const r = await draftMut.mutateAsync({
      crop_code: crop, stage, observation,
      plant_part: plantPart || undefined,
      intent: intent || undefined,
    });
    setDraft(r.draft);
    setWarnings(r.warnings);
    setDuplicates(r.duplicates);
  };

  const handleSubmit = async () => {
    if (!draft) return;
    await submitMut.mutateAsync({ draft, notes: notes || undefined });
    setDraft(null);
    setWarnings([]);
    setDuplicates([]);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Rule Builder</h1>
        <p className="text-muted-foreground">Draft a decision rule with AI; review, then submit to the approval queue. Never writes directly to <code>decision_rules</code>.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>Crop code *</Label><Input value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="e.g. cotton" /></div>
          <div><Label>Stage *</Label><Input value={stage} onChange={(e) => setStage(e.target.value)} placeholder="e.g. flowering" /></div>
          <div className="md:col-span-2"><Label>Observation *</Label><Input value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="e.g. yellowing of lower leaves" /></div>
          <div><Label>Plant part</Label><Input value={plantPart} onChange={(e) => setPlantPart(e.target.value)} placeholder="leaves / stem / fruit" /></div>
          <div><Label>Agronomist intent</Label><Input value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="what should this rule do?" /></div>
          <div className="md:col-span-2">
            <Button onClick={handleDraft} disabled={!crop || !stage || !observation || draftMut.isPending}>
              <Sparkles className="w-4 h-4 mr-2" />{draftMut.isPending ? 'Drafting…' : 'Draft with AI'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {draft && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Proposed Draft</span>
              <Badge variant="outline">confidence: {draft.confidence ?? '—'}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <ul className="list-disc pl-5">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </AlertDescription>
              </Alert>
            )}
            {duplicates.length > 0 && (
              <div className="text-sm text-muted-foreground">Existing matches: {duplicates.map((d) => d.id.slice(0, 8)).join(', ')}</div>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Crop" value={draft.crop_code} />
              <Field label="Stage" value={draft.stage} />
              <Field label="Observation" value={draft.observation} />
              <Field label="Plant part" value={draft.plant_part} />
              <Field label="Action" value={draft.action_type} />
              <Field label="IPM level" value={draft.ipm_level} />
              <Field label="Bee toxicity" value={draft.bee_toxicity} />
            </div>
            <Separator />
            <div>
              <Label>Narration (EN)</Label>
              <p className="text-sm mt-1">{draft.narration?.en}</p>
              {draft.narration?.hi && <><Label className="mt-2 block">Hindi</Label><p className="text-sm">{draft.narration.hi}</p></>}
              {draft.narration?.mr && <><Label className="mt-2 block">Marathi</Label><p className="text-sm">{draft.narration.mr}</p></>}
            </div>
            <div>
              <Label>Conditions JSON</Label>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">{JSON.stringify(draft.conditions_json ?? {}, null, 2)}</pre>
            </div>
            <div>
              <Label>Rationale</Label>
              <p className="text-sm mt-1 italic">{draft.rationale}</p>
            </div>
            <Separator />
            <div>
              <Label>Reviewer notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for the approval queue" />
            </div>
            <Button onClick={handleSubmit} disabled={submitMut.isPending}>
              <Send className="w-4 h-4 mr-2" />{submitMut.isPending ? 'Submitting…' : 'Submit to Approval Queue'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="text-sm font-medium">{value ?? '—'}</div>
    </div>
  );
}
