import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Send, AlertTriangle, Zap, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useAIPromptTemplates,
  useDraftWithTemplate,
  useApplyDraft,
  usePromptRuns,
  type AIPromptTemplate,
} from '@/hooks/useAIPromptTemplates';

export default function AIRuleBuilder() {
  const { data: templates = [], isLoading } = useAIPromptTemplates(true);
  const [templateId, setTemplateId] = useState<string>('');
  const [vars, setVars] = useState<Record<string, any>>({});
  const [draft, setDraft] = useState<any>(null);
  const [editedJson, setEditedJson] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const draftMut = useDraftWithTemplate();
  const applyMut = useApplyDraft();

  const tpl: AIPromptTemplate | undefined = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );

  useEffect(() => {
    if (!templateId && templates.length) setTemplateId(templates[0].id);
  }, [templates, templateId]);

  useEffect(() => {
    setVars({}); setDraft(null); setWarnings([]); setDuplicates([]); setRunId(null); setEditedJson('');
  }, [templateId]);

  const { data: runs = [] } = usePromptRuns(templateId);

  const varSchema: any[] = Array.isArray(tpl?.variables_schema) ? tpl!.variables_schema : [];

  const handleDraft = async () => {
    if (!tpl) return;
    const res = await draftMut.mutateAsync({ template_id: tpl.id, variables: vars, persist: true });
    setDraft(res.draft);
    setEditedJson(JSON.stringify(res.draft, null, 2));
    setWarnings(res.warnings || []);
    setDuplicates(res.duplicates || []);
    setRunId(res.run_id);
  };

  const handleApply = async (mode: 'queue' | 'direct') => {
    if (!runId) return;
    let payload: any = draft;
    try { payload = JSON.parse(editedJson); } catch { /* keep original */ }
    await applyMut.mutateAsync({ run_id: runId, payload, mode, notes: notes || undefined });
    setDraft(null); setRunId(null); setEditedJson(''); setNotes('');
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading templates…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI Rule Builder</h1>
          <p className="text-muted-foreground">
            Pick a template, fill the variables, and let AI draft a record. Drafts go to the approval queue (or apply directly when allowed).
          </p>
        </div>
        <Button asChild variant="outline"><Link to="/super-admin/governance/prompts">Manage Templates</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Template</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} → {t.target_table}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tpl && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div><Badge variant="outline">{tpl.target_table}</Badge> <Badge variant="secondary">{tpl.model}</Badge> {tpl.auto_apply && <Badge>auto-apply</Badge>}</div>
                {tpl.description && <p>{tpl.description}</p>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {tpl && (
        <Card>
          <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {varSchema.length === 0 && <p className="text-sm text-muted-foreground">No variables defined for this template.</p>}
            {varSchema.map((f: any) => (
              <div key={f.key} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
                <Label>{f.label || f.key}{f.required && ' *'}</Label>
                {f.type === 'textarea' ? (
                  <Textarea value={vars[f.key] ?? ''} onChange={(e) => setVars({ ...vars, [f.key]: e.target.value })} placeholder={f.placeholder} />
                ) : (
                  <Input type={f.type === 'number' ? 'number' : 'text'} value={vars[f.key] ?? ''} onChange={(e) => setVars({ ...vars, [f.key]: e.target.value })} placeholder={f.placeholder} />
                )}
              </div>
            ))}
            <div className="md:col-span-2">
              <Button onClick={handleDraft} disabled={draftMut.isPending}>
                <Sparkles className="w-4 h-4 mr-2" />{draftMut.isPending ? 'Drafting…' : 'Draft with AI'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {draft && (
        <Card>
          <CardHeader><CardTitle>Proposed Draft</CardTitle></CardHeader>
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
              <div className="text-sm text-muted-foreground">Existing matches: {duplicates.map((d) => String(d.id).slice(0, 8)).join(', ')}</div>
            )}
            <div>
              <Label>Payload (editable JSON)</Label>
              <Textarea className="font-mono text-xs min-h-[280px]" value={editedJson} onChange={(e) => setEditedJson(e.target.value)} />
            </div>
            <Separator />
            <div>
              <Label>Reviewer notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for the approval queue" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => handleApply('queue')} disabled={applyMut.isPending}>
                <Send className="w-4 h-4 mr-2" />Submit to Approval Queue
              </Button>
              {tpl?.auto_apply && (
                <Button variant="secondary" onClick={() => handleApply('direct')} disabled={applyMut.isPending}>
                  <Zap className="w-4 h-4 mr-2" />Apply Directly
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {tpl && runs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-4 h-4" /> Recent Runs</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {runs.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-sm border-b py-2 last:border-0">
                <div className="font-mono text-xs">{r.id.slice(0, 8)}</div>
                <Badge variant={r.status === 'auto_applied' ? 'default' : r.status === 'submitted' ? 'secondary' : r.status === 'failed' ? 'destructive' : 'outline'}>{r.status}</Badge>
                <div className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
