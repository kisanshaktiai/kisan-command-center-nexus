import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import {
  useAIPromptTemplates,
  useSaveAIPromptTemplate,
  useDeleteAIPromptTemplate,
  type AIPromptTemplate,
} from '@/hooks/useAIPromptTemplates';

const MODEL_OPTIONS = [
  'anthropic/claude-sonnet-4',
  'anthropic/claude-opus-4',
  'google/gemini-3-flash-preview',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'openai/gpt-5',
  'openai/gpt-5-mini',
];

const TARGET_TABLES = [
  'decision_rules',
  'hypotheses',
  'observation_master',
  'safety_verifications',
];

type Form = Partial<AIPromptTemplate> & { id?: string };

const empty: Form = {
  key: '',
  name: '',
  description: '',
  target_table: 'decision_rules',
  model: 'anthropic/claude-sonnet-4',
  temperature: 0.2,
  system_prompt: '',
  user_prompt_template: '',
  variables_schema: [],
  output_schema: { type: 'object', properties: {}, required: [] },
  dedupe_keys: [],
  auto_apply: false,
  is_active: true,
};

export default function AIPromptTemplates() {
  const { data: templates = [], isLoading } = useAIPromptTemplates();
  const save = useSaveAIPromptTemplate();
  const del = useDeleteAIPromptTemplate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);

  const startCreate = () => { setForm(empty); setOpen(true); };
  const startEdit = (t: AIPromptTemplate) => { setForm(t); setOpen(true); };

  const handleSave = async () => {
    const payload: any = { ...form };
    // ensure JSON fields are objects
    for (const k of ['variables_schema', 'output_schema', 'dedupe_keys']) {
      if (typeof payload[k] === 'string') {
        try { payload[k] = JSON.parse(payload[k]); } catch { /* leave */ }
      }
    }
    payload.temperature = Number(payload.temperature ?? 0.2);
    await save.mutateAsync(payload);
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Prompt Templates</h1>
          <p className="text-muted-foreground">Manage editable prompts that drive the AI Rule Builder.</p>
        </div>
        <Button onClick={startCreate}><Plus className="w-4 h-4 mr-2" />New Template</Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t.name}</span>
                    <Badge variant="outline">{t.target_table}</Badge>
                    <Badge variant="secondary">{t.model}</Badge>
                    {t.auto_apply && <Badge>auto-apply</Badge>}
                    {!t.is_active && <Badge variant="destructive">inactive</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{t.key}</div>
                  {t.description && <div className="text-sm text-muted-foreground">{t.description}</div>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(t)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => { if (confirm(`Delete "${t.name}"?`)) del.mutate(t.id); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? 'Edit Template' : 'New Template'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Key (unique)</Label><Input value={form.key ?? ''} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="rule_builder.decision_rules" /></div>
              <div><Label>Name</Label><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Description</Label><Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <Label>Target Table</Label>
                <Select value={form.target_table} onValueChange={(v) => setForm({ ...form, target_table: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TARGET_TABLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Model</Label>
                <Select value={form.model} onValueChange={(v) => setForm({ ...form, model: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODEL_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Temperature</Label><Input type="number" step="0.1" min="0" max="2" value={form.temperature ?? 0.2} onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-6 pt-6">
                <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
                <div className="flex items-center gap-2"><Switch checked={!!form.auto_apply} onCheckedChange={(v) => setForm({ ...form, auto_apply: v })} /><Label>Allow direct apply</Label></div>
              </div>
            </div>
            <div><Label>System Prompt</Label><Textarea className="min-h-[120px]" value={form.system_prompt ?? ''} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} /></div>
            <div><Label>User Prompt Template (use {'{{variable}}'} placeholders)</Label><Textarea className="min-h-[120px] font-mono text-xs" value={form.user_prompt_template ?? ''} onChange={(e) => setForm({ ...form, user_prompt_template: e.target.value })} /></div>
            <div><Label>Variables Schema (JSON array of {'{key,label,type,required}'} )</Label><Textarea className="min-h-[140px] font-mono text-xs" value={typeof form.variables_schema === 'string' ? form.variables_schema : JSON.stringify(form.variables_schema, null, 2)} onChange={(e) => setForm({ ...form, variables_schema: e.target.value as any })} /></div>
            <div><Label>Output Schema (JSON Schema for the tool call)</Label><Textarea className="min-h-[180px] font-mono text-xs" value={typeof form.output_schema === 'string' ? form.output_schema : JSON.stringify(form.output_schema, null, 2)} onChange={(e) => setForm({ ...form, output_schema: e.target.value as any })} /></div>
            <div><Label>Dedupe Keys (JSON array of column names)</Label><Textarea className="min-h-[60px] font-mono text-xs" value={typeof form.dedupe_keys === 'string' ? form.dedupe_keys : JSON.stringify(form.dedupe_keys, null, 2)} onChange={(e) => setForm({ ...form, dedupe_keys: e.target.value as any })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={save.isPending}><Save className="w-4 h-4 mr-2" />{save.isPending ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
