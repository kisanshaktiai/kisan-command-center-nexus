import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CodeMultiSelect } from './CodeMultiSelect';
import { humanizeCode } from './RagBadges';
import { useRagStatesLookup, useUpsertRagSource } from '@/hooks/useRagAdmin';
import {
  RAG_AUTHORITY_TIERS,
  RAG_DOC_TYPES,
  RAG_SOURCE_CODE_RE,
  type RagAuthorityTier,
  type RagDocType,
  type RagSource,
  type RagSourceInput,
} from '@/services/ragAdminService';

interface RagSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass an existing row to edit; omit for "New source". */
  source?: RagSource | null;
  enums?: { authority_tiers: string[]; doc_types: string[] };
}

const emptyForm: RagSourceInput = {
  source_code: '',
  publisher: '',
  authority_tier: 'other',
  doc_type: 'other',
  state_codes: [],
  default_language: 'en',
  source_url: '',
  usage_rights: '',
  trust_prior: 0.5,
  notes: '',
  is_active: true,
};

export function RagSourceDialog({
  open,
  onOpenChange,
  source,
  enums,
}: RagSourceDialogProps) {
  const [form, setForm] = useState<RagSourceInput>(emptyForm);
  const states = useRagStatesLookup();
  const upsert = useUpsertRagSource();
  const isEdit = !!source;

  useEffect(() => {
    if (!open) return;
    setForm(
      source
        ? {
            source_code: source.source_code,
            publisher: source.publisher,
            authority_tier: source.authority_tier,
            doc_type: source.doc_type,
            state_codes: source.state_codes ?? [],
            default_language: source.default_language ?? 'en',
            source_url: source.source_url ?? '',
            usage_rights: source.usage_rights ?? '',
            trust_prior: source.trust_prior ?? 0.5,
            notes: source.notes ?? '',
            is_active: source.is_active ?? true,
          }
        : emptyForm
    );
  }, [open, source]);

  const tiers = (enums?.authority_tiers ??
    RAG_AUTHORITY_TIERS) as RagAuthorityTier[];
  const docTypes = (enums?.doc_types ?? RAG_DOC_TYPES) as RagDocType[];

  const codeValid = RAG_SOURCE_CODE_RE.test(form.source_code);
  const canSave =
    codeValid && form.publisher.trim().length > 0 && !upsert.isPending;

  const set = <K extends keyof RagSourceInput>(k: K, v: RagSourceInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    await upsert.mutateAsync({
      ...form,
      source_code: form.source_code.trim().toUpperCase(),
      publisher: form.publisher.trim(),
      state_codes: form.state_codes?.length ? form.state_codes : null,
      source_url: form.source_url?.trim() || null,
      usage_rights: form.usage_rights?.trim() || null,
      notes: form.notes?.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit ${source?.source_code}` : 'New knowledge source'}
          </DialogTitle>
          <DialogDescription>
            Source-level metadata is captured once here. Every document ingested
            under this code inherits its authority tier, doc type and
            jurisdiction, and retrieval ranks by them.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rag-source-code">Source code</Label>
            <Input
              id="rag-source-code"
              value={form.source_code}
              disabled={isEdit}
              onChange={(e) => set('source_code', e.target.value.toUpperCase())}
              placeholder="MPKV_SUGARCANE_POP"
              className="font-mono uppercase"
            />
            <p className="text-xs text-muted-foreground">
              {codeValid || !form.source_code
                ? 'A–Z, 0–9, underscore · 3–64 chars · cannot change later'
                : 'Must match ^[A-Z0-9_]{3,64}$'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rag-publisher">Publisher</Label>
            <Input
              id="rag-publisher"
              value={form.publisher}
              onChange={(e) => set('publisher', e.target.value)}
              placeholder="Mahatma Phule Krishi Vidyapeeth"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Authority tier</Label>
            <Select
              value={form.authority_tier}
              onValueChange={(v) =>
                set('authority_tier', v as RagAuthorityTier)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {humanizeCode(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Drives the retrieval ranking boost.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Document type</Label>
            <Select
              value={form.doc_type}
              onValueChange={(v) => set('doc_type', v as RagDocType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {docTypes.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {humanizeCode(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>Jurisdiction (states)</Label>
            <CodeMultiSelect
              options={(states.data ?? []).map((s) => ({
                value: s.code,
                label: s.name,
              }))}
              value={form.state_codes ?? []}
              onChange={(v) => set('state_codes', v)}
              placeholder={
                states.isLoading
                  ? 'Loading states…'
                  : 'All India (no state filter)'
              }
              disabled={states.isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rag-lang">Default language</Label>
            <Input
              id="rag-lang"
              value={form.default_language ?? 'en'}
              onChange={(e) => set('default_language', e.target.value)}
              placeholder="en · hi · mr"
              maxLength={8}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rag-url">Source URL</Label>
            <Input
              id="rag-url"
              value={form.source_url ?? ''}
              onChange={(e) => set('source_url', e.target.value)}
              placeholder="https://"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Trust prior</Label>
              <span className="font-mono text-sm">
                {(form.trust_prior ?? 0).toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[form.trust_prior ?? 0.5]}
              onValueChange={([v]) => set('trust_prior', v)}
            />
            <p className="text-xs text-muted-foreground">
              0 = unverified · 1 = fully authoritative. Combined with authority
              tier at retrieval.
            </p>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="rag-rights">Usage rights</Label>
            <Textarea
              id="rag-rights"
              value={form.usage_rights ?? ''}
              onChange={(e) => set('usage_rights', e.target.value)}
              placeholder="Public domain / CC-BY / internal licence reference…"
              className="min-h-[70px]"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="rag-notes">Notes</Label>
            <Textarea
              id="rag-notes"
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <Switch
              checked={!!form.is_active}
              onCheckedChange={(v) => set('is_active', v)}
            />
            <Label>Active (uploads allowed)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            <Save className="mr-2 h-4 w-4" />
            {upsert.isPending
              ? 'Saving…'
              : isEdit
                ? 'Save changes'
                : 'Create source'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
