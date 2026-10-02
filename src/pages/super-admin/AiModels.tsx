// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007  (NEW FILE)
// PATH: src/pages/super-admin/AiModels.tsx
//
// CHANGE LOG
// 2026-10-01 — AI control plane Phase 1 (read-only): the model catalog (ai_model_catalog) with each
//   model's lifecycle status, input types, API contract, active price (ai_model_pricing) and the
//   jobs whose chains use it. Adding, testing and activating models arrives in Phase 2.
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';
import { useAiModels } from '@/hooks/useAiRegistry';
import type { AiModelWithUsage } from '@/services/AiRegistryService';

type StatusFilter = 'all' | 'active' | 'candidate' | 'deprecated' | 'retired';

const statusVariant: Record<AiModelWithUsage['status'], 'success' | 'secondary' | 'warning' | 'destructive'> = {
  active: 'success',
  candidate: 'secondary',
  deprecated: 'warning',
  retired: 'destructive',
};

/** Prices are stored per 1k tokens; shown per 1M tokens, the unit providers publish. */
const perMillion = (perThousand: number | null | undefined) =>
  perThousand === null || perThousand === undefined ? '—' : `$${(perThousand * 1000).toFixed(2)}`;

export default function AiModels() {
  const { t } = useTranslation('admin');
  const [status, setStatus] = useState<StatusFilter>('all');
  const { data, isLoading, isError, error, refetch, isFetching } = useAiModels();

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('aiModels.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('aiModels.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <TabsList>
              {(['all', 'active', 'candidate', 'deprecated', 'retired'] as StatusFilter[]).map((s) => (
                <TabsTrigger key={s} value={s}>
                  {t(`aiModels.status.${s}`)} ({counts[s]})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Alert>
        <AlertDescription>{t('aiModels.readOnlyNote')}</AlertDescription>
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
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
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
    </div>
  );
}
