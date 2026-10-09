// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007
// PATH: src/pages/super-admin/AiFeatureRouting.tsx
//
// CHANGE LOG
// 2026-10-04 — AI control plane Phase 2b (admin writes): the super admin can now change which model
//   answers each job, in what fallback order, and the job's own settings — so switching a feature to
//   a newly released model is a two-minute edit here instead of a migration.
//   The model picker only offers models the database will accept for that job: the same three checks
//   the registry's own ai_route_model_problem() trigger applies (status must be active or deprecated,
//   the model's input types must cover the job's, and the model must accept the job's reasoning
//   effort) are ported in src/lib/aiRegistryValidation.ts and used to filter the list, so a refusal
//   is shown before the save rather than as a Postgres error after it.
//   The chain is replaced through the ai_route_set_steps database function, in one transaction — a
//   delete-then-insert from the browser could leave an active job with no model at all, and the
//   farmer would silently get template text instead of an answer.
//   A job is never deleted (the registry blocks it); switching it off is is_active = false.
// 2026-10-01 — AI control plane Phase 1 (read-only): every AI feature with its jobs and the
//   ordered model chain each job uses, straight from ai_feature / ai_task_route /
//   ai_task_route_step.
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowDown, ArrowUp, ListOrdered, RefreshCw, Settings2, X } from 'lucide-react';
import {
  useAiFeatureRoutes,
  useAiModels,
  useReplaceAiRouteSteps,
  useUpdateAiRoute,
} from '@/hooks/useAiRegistry';
import type { AiModelWithUsage, AiRouteRow } from '@/services/AiRegistryService';
import {
  AI_MAX_CHAIN_STEPS,
  AI_MODALITIES,
  buildRouteParams,
  routeModelProblem,
  validateChain,
  validateModalities,
  type AiModelShape,
} from '@/lib/aiRegistryValidation';

const paramsLabel = (params: Record<string, unknown>) =>
  Object.entries(params)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(' · ');

function ChainCell({ route }: { route: AiRouteRow }) {
  if (route.steps.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {route.steps.map((s, i) => (
        <React.Fragment key={s.step_no}>
          {i > 0 && <span className="text-muted-foreground text-xs">→</span>}
          <Badge variant={i === 0 ? 'default' : 'outline'} className="font-mono text-xs">
            {s.model_key}
          </Badge>
        </React.Fragment>
      ))}
    </div>
  );
}

interface ChainState {
  route: AiRouteRow;
  modelKeys: string[];
  change_reason: string;
}

interface SettingsState {
  route: AiRouteRow;
  description: string;
  required_modalities: string[];
  max_output_tokens: string;
  temperature: string;
  reasoning_effort: string;
  /** '' = not set, 'true' / 'false' = explicit */
  json_mode: string;
  is_active: boolean;
  prefer_free_pool: boolean;
  change_reason: string;
}

const toShape = (m: AiModelWithUsage): AiModelShape => ({
  model_key: m.model_key,
  status: m.status,
  input_modalities: m.input_modalities,
  api_contract: m.api_contract,
});

const settingsFromRoute = (route: AiRouteRow): SettingsState => ({
  route,
  description: route.description,
  required_modalities: [...route.required_modalities],
  max_output_tokens: route.params.max_output_tokens === undefined ? '' : String(route.params.max_output_tokens),
  temperature: route.params.temperature === undefined ? '' : String(route.params.temperature),
  reasoning_effort: route.params.reasoning_effort === undefined ? '' : String(route.params.reasoning_effort),
  json_mode: route.params.json_mode === undefined ? '' : String(route.params.json_mode),
  is_active: route.is_active,
  prefer_free_pool: route.prefer_free_pool,
  change_reason: '',
});

export default function AiFeatureRouting() {
  const { t } = useTranslation('admin');
  const { data, isLoading, isError, error, refetch, isFetching } = useAiFeatureRoutes();
  const modelsQ = useAiModels();
  const replaceSteps = useReplaceAiRouteSteps();
  const updateRoute = useUpdateAiRoute();
  const [chain, setChain] = useState<ChainState | null>(null);
  const [settings, setSettings] = useState<SettingsState | null>(null);

  const modelsByKey = useMemo(() => {
    const map = new Map<string, AiModelShape>();
    (modelsQ.data || []).forEach((m) => map.set(m.model_key, toShape(m)));
    return map;
  }, [modelsQ.data]);

  /** Models the database would accept for this job, minus the ones already in the chain. */
  const pickableModels = useMemo(() => {
    if (!chain) return [] as AiModelWithUsage[];
    return (modelsQ.data || []).filter(
      (m) => !chain.modelKeys.includes(m.model_key) && routeModelProblem(chain.route, toShape(m)) === null,
    );
  }, [chain, modelsQ.data]);

  const moveStep = (index: number, delta: number) => {
    if (!chain) return;
    const next = [...chain.modelKeys];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setChain({ ...chain, modelKeys: next });
  };

  const saveChain = async () => {
    if (!chain) return;
    const problems = validateChain(chain.route, chain.modelKeys, modelsByKey);
    if (problems.length > 0) {
      toast.error(problems[0]);
      return;
    }
    if (chain.route.is_active && chain.modelKeys.length === 0) {
      toast.error(t('aiRouting.activeNeedsModel'));
      return;
    }
    if (!chain.change_reason.trim()) {
      toast.error(t('aiRouting.reasonRequired'));
      return;
    }
    try {
      await replaceSteps.mutateAsync({
        taskKey: chain.route.task_key,
        modelKeys: chain.modelKeys,
        changeReason: chain.change_reason.trim(),
      });
      toast.success(t('aiRouting.chainSaved', { job: chain.route.task_key }));
      setChain(null);
    } catch (e) {
      toast.error((e as Error)?.message || t('aiRouting.saveError'));
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    const modalityProblems = validateModalities(settings.required_modalities, t('aiRouting.inputs'));
    if (modalityProblems.length > 0) {
      toast.error(modalityProblems[0]);
      return;
    }
    const { params, problems } = buildRouteParams({
      max_output_tokens: settings.max_output_tokens,
      temperature: settings.temperature,
      reasoning_effort: settings.reasoning_effort,
      json_mode: settings.json_mode === '' ? null : settings.json_mode === 'true',
    });
    if (problems.length > 0) {
      toast.error(problems[0]);
      return;
    }
    // Changing the job's input types or reasoning effort can make a model already in the chain
    // unacceptable — the registry's BEFORE UPDATE trigger would reject the save. Say so first.
    const proposed = { task_key: settings.route.task_key, required_modalities: settings.required_modalities, params };
    for (const step of settings.route.steps) {
      const model = modelsByKey.get(step.model_key);
      if (!model) continue;
      const problem = routeModelProblem(proposed, model);
      if (problem) {
        toast.error(t('aiRouting.breaksChain', { problem }));
        return;
      }
    }
    if (settings.is_active && settings.route.steps.length === 0) {
      toast.error(t('aiRouting.activeNeedsModel'));
      return;
    }
    if (!settings.change_reason.trim()) {
      toast.error(t('aiRouting.reasonRequired'));
      return;
    }
    try {
      await updateRoute.mutateAsync({
        taskKey: settings.route.task_key,
        patch: {
          description: settings.description.trim(),
          required_modalities: settings.required_modalities,
          params,
          is_active: settings.is_active,
          prefer_free_pool: settings.prefer_free_pool,
          change_reason: settings.change_reason.trim(),
        },
      });
      toast.success(t('aiRouting.settingsSaved', { job: settings.route.task_key }));
      setSettings(null);
    } catch (e) {
      toast.error((e as Error)?.message || t('aiRouting.saveError'));
    }
  };

  const toggleSettingsModality = (m: string) => {
    if (!settings) return;
    const has = settings.required_modalities.includes(m);
    setSettings({
      ...settings,
      required_modalities: has
        ? settings.required_modalities.filter((x) => x !== m)
        : [...settings.required_modalities, m],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('aiRouting.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('aiRouting.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetch(); modelsQ.refetch(); }} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Alert>
        <AlertDescription>{t('aiRouting.writeNote')}</AlertDescription>
      </Alert>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error)?.message || t('aiRouting.loadError')}</AlertDescription>
        </Alert>
      )}

      {isLoading && <Skeleton className="h-40 w-full" />}

      {(data || []).map((feature) => (
        <Card key={feature.feature_key}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                {feature.name}
                <Badge variant="outline" className="font-mono text-xs">{feature.feature_key}</Badge>
                {!feature.is_active && <Badge variant="secondary">{t('aiRouting.inactive')}</Badge>}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {t('aiRouting.jobCount', { count: feature.routes.length })}
              </span>
            </div>
            <CardDescription>{feature.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {feature.routes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('aiRouting.noJobs')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('aiRouting.job')}</TableHead>
                      <TableHead>{t('aiRouting.modelChain')}</TableHead>
                      <TableHead>{t('aiRouting.inputs')}</TableHead>
                      <TableHead>{t('aiRouting.settings')}</TableHead>
                      <TableHead>{t('aiRouting.status')}</TableHead>
                      <TableHead className="text-right">{t('aiRouting.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feature.routes.map((route) => (
                      <TableRow key={route.task_key}>
                        <TableCell className="align-top">
                          <div className="font-mono text-xs font-medium">{route.task_key}</div>
                          <div className="text-xs text-muted-foreground max-w-md">{route.description}</div>
                        </TableCell>
                        <TableCell className="align-top">
                          <ChainCell route={route} />
                        </TableCell>
                        <TableCell className="align-top text-xs">{route.required_modalities.join(', ')}</TableCell>
                        <TableCell className="align-top font-mono text-xs">
                          {Object.keys(route.params).length === 0 ? (
                            <span className="text-muted-foreground">{t('aiRouting.defaultSettings')}</span>
                          ) : (
                            paramsLabel(route.params)
                          )}
                          {!route.prefer_free_pool && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs">{t('aiRouting.freePoolOff')}</Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {route.is_active ? (
                            route.steps.length === 0 ? (
                              <Badge variant="warning">{t('aiRouting.activeNoModel')}</Badge>
                            ) : (
                              <Badge variant="success">{t('aiRouting.active')}</Badge>
                            )
                          ) : (
                            <Badge variant="secondary">{t('aiRouting.inactive')}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title={t('aiRouting.editChain')}
                              onClick={() => setChain({ route, modelKeys: route.steps.map((s) => s.model_key), change_reason: '' })}
                            >
                              <ListOrdered className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title={t('aiRouting.editSettings')}
                              onClick={() => setSettings(settingsFromRoute(route))}
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Model chain editor */}
      <Dialog open={!!chain} onOpenChange={(open) => { if (!open) setChain(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {chain && (
            <>
              <DialogHeader>
                <DialogTitle>{t('aiRouting.chainTitle', { job: chain.route.task_key })}</DialogTitle>
                <DialogDescription>{t('aiRouting.chainHint')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  {chain.modelKeys.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('aiRouting.chainEmpty')}</p>
                  )}
                  {chain.modelKeys.map((key, i) => (
                    <div key={key} className="flex items-center gap-2 rounded-md border p-2">
                      <Badge variant={i === 0 ? 'default' : 'outline'} className="shrink-0">
                        {i === 0 ? t('aiRouting.primary') : t('aiRouting.fallbackN', { n: i })}
                      </Badge>
                      <span className="flex-1 font-mono text-xs">{key}</span>
                      <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => moveStep(i, -1)} title={t('aiRouting.moveUp')}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" disabled={i === chain.modelKeys.length - 1} onClick={() => moveStep(i, 1)} title={t('aiRouting.moveDown')}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={t('aiRouting.removeStep')}
                        onClick={() => setChain({ ...chain, modelKeys: chain.modelKeys.filter((k) => k !== key) })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {chain.modelKeys.length < AI_MAX_CHAIN_STEPS && (
                  <div className="space-y-1">
                    <Label htmlFor="ai-chain-add">{t('aiRouting.addModel')}</Label>
                    <Select
                      value="__none__"
                      onValueChange={(v) => {
                        if (v === '__none__') return;
                        setChain({ ...chain, modelKeys: [...chain.modelKeys, v] });
                      }}
                    >
                      <SelectTrigger id="ai-chain-add">
                        <SelectValue placeholder={t('aiRouting.addModelPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t('aiRouting.addModelPlaceholder')}</SelectItem>
                        {pickableModels.map((m) => (
                          <SelectItem key={m.model_key} value={m.model_key}>{m.model_key}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t('aiRouting.addModelHelp')}</p>
                    {pickableModels.length === 0 && (
                      <Alert>
                        <AlertDescription className="text-xs">{t('aiRouting.noEligibleModels')}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="ai-chain-reason">{t('aiRouting.changeReason')}</Label>
                  <Input
                    id="ai-chain-reason"
                    value={chain.change_reason}
                    placeholder={t('aiRouting.changeReasonHint')}
                    onChange={(e) => setChain({ ...chain, change_reason: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setChain(null)} disabled={replaceSteps.isPending}>{t('aiRouting.cancel')}</Button>
                <Button onClick={saveChain} disabled={replaceSteps.isPending}>{t('aiRouting.save')}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Job settings editor */}
      <Dialog open={!!settings} onOpenChange={(open) => { if (!open) setSettings(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {settings && (
            <>
              <DialogHeader>
                <DialogTitle>{t('aiRouting.settingsTitle', { job: settings.route.task_key })}</DialogTitle>
                <DialogDescription>{t('aiRouting.settingsHint')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="ai-route-description">{t('aiRouting.description')}</Label>
                  <Textarea
                    id="ai-route-description"
                    rows={2}
                    value={settings.description}
                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('aiRouting.inputs')}</Label>
                  <div className="flex flex-wrap gap-4">
                    {AI_MODALITIES.map((m) => (
                      <div key={m} className="flex items-center gap-2">
                        <Checkbox
                          id={`ai-route-modality-${m}`}
                          checked={settings.required_modalities.includes(m)}
                          onCheckedChange={() => toggleSettingsModality(m)}
                        />
                        <Label htmlFor={`ai-route-modality-${m}`} className="text-xs font-normal">{m}</Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('aiRouting.inputsHelp')}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="ai-route-max-tokens">{t('aiRouting.maxOutputTokens')}</Label>
                    <Input
                      id="ai-route-max-tokens"
                      inputMode="numeric"
                      value={settings.max_output_tokens}
                      placeholder={t('aiRouting.notSet')}
                      onChange={(e) => setSettings({ ...settings, max_output_tokens: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ai-route-temp">{t('aiRouting.temperature')}</Label>
                    <Input
                      id="ai-route-temp"
                      inputMode="decimal"
                      value={settings.temperature}
                      placeholder={t('aiRouting.notSet')}
                      onChange={(e) => setSettings({ ...settings, temperature: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="ai-route-effort">{t('aiRouting.reasoningEffort')}</Label>
                    <Input
                      id="ai-route-effort"
                      value={settings.reasoning_effort}
                      className="font-mono text-xs"
                      placeholder={t('aiRouting.notSet')}
                      onChange={(e) => setSettings({ ...settings, reasoning_effort: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ai-route-json">{t('aiRouting.jsonMode')}</Label>
                    <Select value={settings.json_mode || '__unset__'} onValueChange={(v) => setSettings({ ...settings, json_mode: v === '__unset__' ? '' : v })}>
                      <SelectTrigger id="ai-route-json"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unset__">{t('aiRouting.notSet')}</SelectItem>
                        <SelectItem value="true">{t('aiRouting.jsonOn')}</SelectItem>
                        <SelectItem value="false">{t('aiRouting.jsonOff')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t('aiRouting.paramsHelp')}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ai-route-free-pool">{t('aiRouting.preferFreePool')}</Label>
                    <p className="text-xs text-muted-foreground max-w-sm">{t('aiRouting.preferFreePoolHelp')}</p>
                  </div>
                  <Switch
                    id="ai-route-free-pool"
                    checked={settings.prefer_free_pool}
                    onCheckedChange={(v) => setSettings({ ...settings, prefer_free_pool: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ai-route-active">{t('aiRouting.activeField')}</Label>
                    <p className="text-xs text-muted-foreground max-w-sm">{t('aiRouting.activeHelp')}</p>
                  </div>
                  <Switch
                    id="ai-route-active"
                    checked={settings.is_active}
                    onCheckedChange={(v) => setSettings({ ...settings, is_active: v })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ai-route-reason">{t('aiRouting.changeReason')}</Label>
                  <Input
                    id="ai-route-reason"
                    value={settings.change_reason}
                    placeholder={t('aiRouting.changeReasonHint')}
                    onChange={(e) => setSettings({ ...settings, change_reason: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSettings(null)} disabled={updateRoute.isPending}>{t('aiRouting.cancel')}</Button>
                <Button onClick={saveSettings} disabled={updateRoute.isPending}>{t('aiRouting.save')}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
