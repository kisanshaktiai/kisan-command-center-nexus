// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007  (NEW FILE)
// PATH: src/pages/super-admin/AiFeatureRouting.tsx
//
// CHANGE LOG
// 2026-10-01 — AI control plane Phase 1 (read-only): every AI feature with its jobs and the
//   ordered model chain each job uses, straight from ai_feature / ai_task_route /
//   ai_task_route_step. Editing chains and settings arrives in Phase 2 (route 'ai_route_set_steps').
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';
import { useAiFeatureRoutes } from '@/hooks/useAiRegistry';
import type { AiRouteRow } from '@/services/AiRegistryService';

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

export default function AiFeatureRouting() {
  const { t } = useTranslation('admin');
  const { data, isLoading, isError, error, refetch, isFetching } = useAiFeatureRoutes();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('aiRouting.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('aiRouting.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Alert>
        <AlertDescription>{t('aiRouting.readOnlyNote')}</AlertDescription>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
