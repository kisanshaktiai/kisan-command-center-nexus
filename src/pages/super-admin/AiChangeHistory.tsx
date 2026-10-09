// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007  (NEW FILE)
// PATH: src/pages/super-admin/AiChangeHistory.tsx
//
// CHANGE LOG
// 2026-10-01 — AI control plane Phase 1 (read-only): every change to the AI registry
//   (ai_registry_audit_log — catalog, features, jobs, chains, prices) with who, when, why and the
//   fields that changed. Restoring an earlier state arrives in Phase 2.
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
import { useAiChangeHistory } from '@/hooks/useAiRegistry';
import type { AiAuditRow } from '@/services/AiRegistryService';

type TableFilter = 'all' | 'ai_task_route' | 'ai_task_route_step' | 'ai_model_catalog' | 'ai_model_pricing' | 'ai_feature';

const TABLE_FILTERS: TableFilter[] = ['all', 'ai_task_route', 'ai_task_route_step', 'ai_model_catalog', 'ai_model_pricing', 'ai_feature'];

const IGNORED_KEYS = new Set(['updated_at', 'created_at']);

/** Keys whose value differs between old and new, rendered as `key: old → new`. */
function changedFields(row: AiAuditRow): string[] {
  if (row.action === 'insert') {
    return Object.entries(row.new_value || {})
      .filter(([k]) => !IGNORED_KEYS.has(k))
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  }
  if (row.action === 'delete') {
    return Object.entries(row.old_value || {})
      .filter(([k]) => !IGNORED_KEYS.has(k))
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  }
  const oldV = row.old_value || {};
  const newV = row.new_value || {};
  const keys = new Set([...Object.keys(oldV), ...Object.keys(newV)]);
  const out: string[] = [];
  keys.forEach((k) => {
    if (IGNORED_KEYS.has(k)) return;
    const a = JSON.stringify(oldV[k]);
    const b = JSON.stringify(newV[k]);
    if (a !== b) out.push(`${k}: ${a ?? 'null'} → ${b ?? 'null'}`);
  });
  return out;
}

const actionVariant: Record<AiAuditRow['action'], 'success' | 'default' | 'destructive'> = {
  insert: 'success',
  update: 'default',
  delete: 'destructive',
};

export default function AiChangeHistory() {
  const { t } = useTranslation('admin');
  const [table, setTable] = useState<TableFilter>('all');
  const { data, isLoading, isError, error, refetch, isFetching } = useAiChangeHistory(300);

  const rows = useMemo(
    () => (data || []).filter((r) => table === 'all' || r.table_name === table),
    [data, table],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('aiHistory.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('aiHistory.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={table} onValueChange={(v) => setTable(v as TableFilter)}>
            <TabsList>
              {TABLE_FILTERS.map((f) => (
                <TabsTrigger key={f} value={f}>{t(`aiHistory.tables.${f}`)}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error)?.message || t('aiHistory.loadError')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('aiHistory.latest', { count: rows.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('aiHistory.when')}</TableHead>
                    <TableHead>{t('aiHistory.what')}</TableHead>
                    <TableHead>{t('aiHistory.action')}</TableHead>
                    <TableHead>{t('aiHistory.who')}</TableHead>
                    <TableHead>{t('aiHistory.reason')}</TableHead>
                    <TableHead>{t('aiHistory.changes')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const fields = changedFields(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="align-top whitespace-nowrap text-xs tabular-nums">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="text-xs text-muted-foreground">{t(`aiHistory.tables.${r.table_name}`, { defaultValue: r.table_name })}</div>
                          <div className="font-mono text-xs font-medium">{r.row_key}</div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant={actionVariant[r.action]}>{t(`aiHistory.actions.${r.action}`)}</Badge>
                        </TableCell>
                        <TableCell className="align-top text-xs">
                          {r.changed_by_email || (r.changed_by ? r.changed_by.slice(0, 8) : t('aiHistory.system'))}
                        </TableCell>
                        <TableCell className="align-top text-xs max-w-xs">{r.change_reason || '—'}</TableCell>
                        <TableCell className="align-top font-mono text-xs max-w-lg">
                          {fields.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <ul className="space-y-0.5">
                              {fields.slice(0, 8).map((f, i) => (
                                <li key={i} className="break-all">{f}</li>
                              ))}
                              {fields.length > 8 && (
                                <li className="text-muted-foreground">{t('aiHistory.moreFields', { count: fields.length - 8 })}</li>
                              )}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                        {t('aiHistory.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
