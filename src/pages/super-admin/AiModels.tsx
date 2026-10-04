// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007
// PATH: src/pages/super-admin/AiModels.tsx
//
// CHANGE LOG
// 2026-10-04 — AI control plane Phase 2b (admin writes): the super admin can now add a model, change
//   its lifecycle status and settings, and set its price — so a model a provider releases next month
//   is added here as data, with no code change and no migration.
//   Three things are deliberately NOT editable, because the database refuses them:
//     * provider / model id / model_key — identity is immutable after insert (catalog guard). A
//       renamed model is a new row; the old one is retired.
//     * delete — there is no delete. ai_model_metrics references the catalog ON DELETE RESTRICT, so a
//       model that has answered one call can never be removed without losing its cost history.
//       "Removing" a model is status = retired, which stops the router using it and keeps the audit.
//     * price edits in place — a new price is a new effective-from row, so already-computed costs stay
//       explainable.
//   Every save takes a mandatory change reason, which the registry trigger writes to the audit log.
// 2026-10-01 — AI control plane Phase 1 (read-only): the model catalog (ai_model_catalog) with each
//   model's lifecycle status, input types, API contract, active price (ai_model_pricing) and the
//   jobs whose chains use it.
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IndianRupee, Pencil, Plus, RefreshCw } from 'lucide-react';
import { useAiModels, useAiProviders, useCreateAiModel, useUpdateAiModel, useUpsertAiPricing } from '@/hooks/useAiRegistry';
import type { AiModelWithUsage } from '@/services/AiRegistryService';
import {
  AI_MODALITIES,
  AI_MODEL_STATUSES,
  AI_TEMPERATURE_MODES,
  AI_TOKEN_PARAMS,
  aiModelKey,
  buildPricing,
  validateModelInput,
  type AiModelStatus,
} from '@/lib/aiRegistryValidation';

type StatusFilter = 'all' | AiModelStatus;

const statusVariant: Record<AiModelWithUsage['status'], 'success' | 'secondary' | 'warning' | 'destructive'> = {
  active: 'success',
  candidate: 'secondary',
  deprecated: 'warning',
  retired: 'destructive',
};

/** Prices are stored per 1k tokens; shown per 1M tokens, the unit providers publish. */
const perMillion = (perThousand: number | null | undefined) =>
  perThousand === null || perThousand === undefined ? '—' : `$${(perThousand * 1000).toFixed(2)}`;

const toMillionField = (perThousand: number | null | undefined) =>
  perThousand === null || perThousand === undefined ? '' : String(Number((perThousand * 1000).toFixed(4)));

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Form state shared by the add and edit dialogs; identity fields are read-only when editing. */
interface ModelForm {
  mode: 'create' | 'edit';
  model_key: string | null;
  provider: string;
  api_model_id: string;
  status: AiModelStatus;
  input_modalities: string[];
  token_param: string;
  temperature: string;
  reasoning_efforts: string;
  shutdown_date: string;
  replacement_model_key: string;
  source_url: string;
  notes: string;
  change_reason: string;
}

interface PriceForm {
  model_key: string;
  input_per_million: string;
  cached_input_per_million: string;
  output_per_million: string;
  effective_from: string;
  source_url: string;
  notes: string;
}

const emptyModelForm = (provider: string): ModelForm => ({
  mode: 'create',
  model_key: null,
  provider,
  api_model_id: '',
  // A new model starts as a candidate: the route guard refuses to put a candidate in a chain, so it
  // cannot reach a farmer before it has been promoted deliberately.
  status: 'candidate',
  input_modalities: ['text'],
  token_param: 'max_tokens',
  temperature: 'allowed',
  reasoning_efforts: '',
  shutdown_date: '',
  replacement_model_key: '',
  source_url: '',
  notes: '',
  change_reason: '',
});

const formFromModel = (m: AiModelWithUsage): ModelForm => ({
  mode: 'edit',
  model_key: m.model_key,
  provider: m.provider,
  api_model_id: m.api_model_id,
  status: m.status,
  input_modalities: [...m.input_modalities],
  token_param: m.api_contract.token_param || 'max_tokens',
  temperature: m.api_contract.temperature || 'allowed',
  reasoning_efforts: (m.api_contract.reasoning_efforts || []).join(', '),
  shutdown_date: m.shutdown_date || '',
  replacement_model_key: m.replacement_model_key || '',
  source_url: m.source_url || '',
  notes: m.notes || '',
  change_reason: '',
});

const parseEfforts = (raw: string) =>
  raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);

export default function AiModels() {
  const { t } = useTranslation('admin');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [form, setForm] = useState<ModelForm | null>(null);
  const [price, setPrice] = useState<PriceForm | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useAiModels();
  const providersQ = useAiProviders();
  const createModel = useCreateAiModel();
  const updateModel = useUpdateAiModel();
  const upsertPrice = useUpsertAiPricing();

  const rows = useMemo(
    () => (data || []).filter((m) => status === 'all' || m.status === status),
    [data, status],
  );
  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: 0, active: 0, candidate: 0, deprecated: 0, retired: 0 };
    (data || []).forEach((m) => {
      c.all += 1;
      c[m.status] += 1;
    });
    return c;
  }, [data]);

  const providers = providersQ.data || [];
  const saving = createModel.isPending || updateModel.isPending;

  const toggleModality = (m: string) => {
    if (!form) return;
    const has = form.input_modalities.includes(m);
    setForm({
      ...form,
      input_modalities: has ? form.input_modalities.filter((x) => x !== m) : [...form.input_modalities, m],
    });
  };

  const saveModel = async () => {
    if (!form) return;
    const api_contract = {
      token_param: form.token_param,
      temperature: form.temperature as 'allowed' | 'omit',
      reasoning_efforts: parseEfforts(form.reasoning_efforts),
    };
    const problems = validateModelInput({
      provider: form.provider,
      api_model_id: form.api_model_id,
      status: form.status,
      input_modalities: form.input_modalities,
      api_contract,
      replacement_model_key: form.replacement_model_key || null,
      change_reason: form.change_reason,
    });
    if (problems.length > 0) {
      toast.error(problems[0]);
      return;
    }
    try {
      if (form.mode === 'create') {
        await createModel.mutateAsync({
          provider: form.provider,
          api_model_id: form.api_model_id,
          status: form.status,
          input_modalities: form.input_modalities,
          api_contract,
          shutdown_date: form.shutdown_date || null,
          replacement_model_key: form.replacement_model_key || null,
          source_url: form.source_url,
          notes: form.notes,
          change_reason: form.change_reason,
        });
        toast.success(t('aiModels.created', { model: aiModelKey(form.provider, form.api_model_id) }));
      } else {
        await updateModel.mutateAsync({
          modelKey: form.model_key!,
          patch: {
            status: form.status,
            input_modalities: form.input_modalities,
            api_contract,
            shutdown_date: form.shutdown_date || null,
            replacement_model_key: form.replacement_model_key || null,
            source_url: form.source_url,
            notes: form.notes,
            change_reason: form.change_reason,
          },
        });
        toast.success(t('aiModels.saved', { model: form.model_key }));
      }
      setForm(null);
    } catch (e) {
      toast.error((e as Error)?.message || t('aiModels.saveError'));
    }
  };

  const savePrice = async () => {
    if (!price) return;
    const { values, problems } = buildPricing(price);
    if (problems.length > 0) {
      toast.error(problems[0]);
      return;
    }
    try {
      await upsertPrice.mutateAsync({
        model_name: price.model_key,
        ...values,
        source_url: price.source_url,
        notes: price.notes,
      });
      toast.success(t('aiModels.priceSaved', { model: price.model_key }));
      setPrice(null);
    } catch (e) {
      toast.error((e as Error)?.message || t('aiModels.saveError'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('aiModels.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('aiModels.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <TabsList>
              {(['all', ...AI_MODEL_STATUSES] as StatusFilter[]).map((s) => (
                <TabsTrigger key={s} value={s}>
                  {t(`aiModels.status.${s}`)} ({counts[s]})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={() => setForm(emptyModelForm(providers[0] || ''))} disabled={providers.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            {t('aiModels.addModel')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Alert>
        <AlertDescription>{t('aiModels.writeNote')}</AlertDescription>
      </Alert>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error)?.message || t('aiModels.loadError')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('aiModels.catalog')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('aiModels.model')}</TableHead>
                    <TableHead>{t('aiModels.statusCol')}</TableHead>
                    <TableHead>{t('aiModels.inputs')}</TableHead>
                    <TableHead>{t('aiModels.contract')}</TableHead>
                    <TableHead className="text-right">{t('aiModels.priceIn')}</TableHead>
                    <TableHead className="text-right">{t('aiModels.priceCached')}</TableHead>
                    <TableHead className="text-right">{t('aiModels.priceOut')}</TableHead>
                    <TableHead>{t('aiModels.usedBy')}</TableHead>
                    <TableHead className="text-right">{t('aiModels.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((m) => (
                    <TableRow key={m.model_key}>
                      <TableCell className="align-top">
                        <div className="font-mono text-xs font-medium">{m.model_key}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.provider} · {m.api_model_id}
                        </div>
                        {m.shutdown_date && (
                          <div className="text-xs text-muted-foreground">
                            {t('aiModels.shutdown')}: {m.shutdown_date}
                            {m.replacement_model_key && ` → ${m.replacement_model_key}`}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={statusVariant[m.status]}>{t(`aiModels.status.${m.status}`)}</Badge>
                      </TableCell>
                      <TableCell className="align-top text-xs">{m.input_modalities.join(', ')}</TableCell>
                      <TableCell className="align-top font-mono text-xs">
                        <div>{m.api_contract.token_param}</div>
                        <div>temperature: {m.api_contract.temperature}</div>
                        <div>
                          reasoning: {m.api_contract.reasoning_efforts.length ? m.api_contract.reasoning_efforts.join('/') : '—'}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-right tabular-nums">{perMillion(m.price?.input_cost_per_1k)}</TableCell>
                      <TableCell className="align-top text-right tabular-nums">{perMillion(m.price?.cached_input_cost_per_1k)}</TableCell>
                      <TableCell className="align-top text-right tabular-nums">{perMillion(m.price?.output_cost_per_1k)}</TableCell>
                      <TableCell className="align-top">
                        {m.used_by.length === 0 ? (
                          <span className="text-xs text-muted-foreground">{t('aiModels.unused')}</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {m.used_by.map((k) => (
                              <Badge key={k} variant="outline" className="font-mono text-xs">{k}</Badge>
                            ))}
                          </div>
                        )}
                        {m.status === 'active' && !m.price && (
                          <div className="mt-1">
                            <Badge variant="warning">{t('aiModels.noPrice')}</Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setForm(formFromModel(m))} title={t('aiModels.edit')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t('aiModels.setPrice')}
                            onClick={() =>
                              setPrice({
                                model_key: m.model_key,
                                input_per_million: toMillionField(m.price?.input_cost_per_1k),
                                cached_input_per_million: toMillionField(m.price?.cached_input_cost_per_1k),
                                output_per_million: toMillionField(m.price?.output_cost_per_1k),
                                effective_from: todayIso(),
                                source_url: '',
                                notes: '',
                              })
                            }
                          >
                            <IndianRupee className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                        {t('aiModels.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">{t('aiModels.priceUnitNote')}</p>
        </CardContent>
      </Card>

      {/* Add / edit model */}
      <Dialog open={!!form} onOpenChange={(open) => { if (!open) setForm(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {form && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {form.mode === 'create' ? t('aiModels.addTitle') : t('aiModels.editTitle', { model: form.model_key })}
                </DialogTitle>
                <DialogDescription>
                  {form.mode === 'create' ? t('aiModels.addHint') : t('aiModels.editHint')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="ai-model-provider">{t('aiModels.provider')}</Label>
                    {form.mode === 'create' ? (
                      <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                        <SelectTrigger id="ai-model-provider"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {providers.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input id="ai-model-provider" value={form.provider} readOnly disabled className="font-mono text-xs" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ai-model-id">{t('aiModels.apiModelId')}</Label>
                    <Input
                      id="ai-model-id"
                      value={form.api_model_id}
                      readOnly={form.mode === 'edit'}
                      disabled={form.mode === 'edit'}
                      className="font-mono text-xs"
                      placeholder={t('aiModels.apiModelIdHint')}
                      onChange={(e) => setForm({ ...form, api_model_id: e.target.value })}
                    />
                  </div>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  {t('aiModels.modelKeyPreview')}: {form.api_model_id ? aiModelKey(form.provider, form.api_model_id) : '—'}
                </p>
                {form.mode === 'create' && (
                  <Alert>
                    <AlertDescription className="text-xs">{t('aiModels.identityLocked')}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1">
                  <Label htmlFor="ai-model-status">{t('aiModels.statusCol')}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AiModelStatus })}>
                    <SelectTrigger id="ai-model-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AI_MODEL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{t(`aiModels.status.${s}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t('aiModels.statusHelp')}</p>
                </div>

                <div className="space-y-2">
                  <Label>{t('aiModels.inputs')}</Label>
                  <div className="flex flex-wrap gap-4">
                    {AI_MODALITIES.map((m) => (
                      <div key={m} className="flex items-center gap-2">
                        <Checkbox
                          id={`ai-model-modality-${m}`}
                          checked={form.input_modalities.includes(m)}
                          onCheckedChange={() => toggleModality(m)}
                        />
                        <Label htmlFor={`ai-model-modality-${m}`} className="text-xs font-normal">{m}</Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('aiModels.inputsHelp')}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="ai-model-token-param">{t('aiModels.tokenParam')}</Label>
                    <Select value={form.token_param} onValueChange={(v) => setForm({ ...form, token_param: v })}>
                      <SelectTrigger id="ai-model-token-param"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AI_TOKEN_PARAMS.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ai-model-temperature">{t('aiModels.temperature')}</Label>
                    <Select value={form.temperature} onValueChange={(v) => setForm({ ...form, temperature: v })}>
                      <SelectTrigger id="ai-model-temperature"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AI_TEMPERATURE_MODES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t('aiModels.contractHelp')}</p>

                <div className="space-y-1">
                  <Label htmlFor="ai-model-efforts">{t('aiModels.reasoningEfforts')}</Label>
                  <Input
                    id="ai-model-efforts"
                    value={form.reasoning_efforts}
                    className="font-mono text-xs"
                    placeholder={t('aiModels.reasoningEffortsHint')}
                    onChange={(e) => setForm({ ...form, reasoning_efforts: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{t('aiModels.reasoningEffortsHelp')}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="ai-model-shutdown">{t('aiModels.shutdownDate')}</Label>
                    <Input
                      id="ai-model-shutdown"
                      type="date"
                      value={form.shutdown_date}
                      onChange={(e) => setForm({ ...form, shutdown_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ai-model-replacement">{t('aiModels.replacement')}</Label>
                    <Select
                      value={form.replacement_model_key || '__none__'}
                      onValueChange={(v) => setForm({ ...form, replacement_model_key: v === '__none__' ? '' : v })}
                    >
                      <SelectTrigger id="ai-model-replacement"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t('aiModels.noReplacement')}</SelectItem>
                        {(data || [])
                          .filter((m) => m.model_key !== form.model_key)
                          .map((m) => (
                            <SelectItem key={m.model_key} value={m.model_key}>{m.model_key}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ai-model-source">{t('aiModels.sourceUrl')}</Label>
                  <Input
                    id="ai-model-source"
                    value={form.source_url}
                    placeholder={t('aiModels.sourceUrlHint')}
                    onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ai-model-notes">{t('aiModels.notes')}</Label>
                  <Textarea id="ai-model-notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ai-model-reason">{t('aiModels.changeReason')}</Label>
                  <Input
                    id="ai-model-reason"
                    value={form.change_reason}
                    placeholder={t('aiModels.changeReasonHint')}
                    onChange={(e) => setForm({ ...form, change_reason: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>{t('aiModels.cancel')}</Button>
                <Button onClick={saveModel} disabled={saving}>{t('aiModels.save')}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Set price */}
      <Dialog open={!!price} onOpenChange={(open) => { if (!open) setPrice(null); }}>
        <DialogContent className="max-w-md">
          {price && (
            <>
              <DialogHeader>
                <DialogTitle>{t('aiModels.priceTitle', { model: price.model_key })}</DialogTitle>
                <DialogDescription>{t('aiModels.priceHint')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="ai-price-in">{t('aiModels.priceInPerM')}</Label>
                  <Input id="ai-price-in" inputMode="decimal" value={price.input_per_million} onChange={(e) => setPrice({ ...price, input_per_million: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ai-price-cached">{t('aiModels.priceCachedPerM')}</Label>
                  <Input id="ai-price-cached" inputMode="decimal" value={price.cached_input_per_million} onChange={(e) => setPrice({ ...price, cached_input_per_million: e.target.value })} />
                  <p className="text-xs text-muted-foreground">{t('aiModels.priceCachedHelp')}</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ai-price-out">{t('aiModels.priceOutPerM')}</Label>
                  <Input id="ai-price-out" inputMode="decimal" value={price.output_per_million} onChange={(e) => setPrice({ ...price, output_per_million: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ai-price-from">{t('aiModels.effectiveFrom')}</Label>
                  <Input id="ai-price-from" type="date" value={price.effective_from} onChange={(e) => setPrice({ ...price, effective_from: e.target.value })} />
                  <p className="text-xs text-muted-foreground">{t('aiModels.effectiveFromHelp')}</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ai-price-source">{t('aiModels.sourceUrl')}</Label>
                  <Input id="ai-price-source" value={price.source_url} placeholder={t('aiModels.sourceUrlHint')} onChange={(e) => setPrice({ ...price, source_url: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ai-price-notes">{t('aiModels.notes')}</Label>
                  <Textarea id="ai-price-notes" rows={2} value={price.notes} onChange={(e) => setPrice({ ...price, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPrice(null)} disabled={upsertPrice.isPending}>{t('aiModels.cancel')}</Button>
                <Button onClick={savePrice} disabled={upsertPrice.isPending}>{t('aiModels.save')}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
