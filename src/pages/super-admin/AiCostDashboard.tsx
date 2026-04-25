import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAiCosts } from '@/hooks/useAiCosts';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from 'recharts';
import { Download, RefreshCw } from 'lucide-react';

const formatUsd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });

export default function AiCostDashboard() {
  const { t } = useTranslation('admin');
  const [days, setDays] = useState<number>(7);
  const { data, isLoading, refetch, isFetching } = useAiCosts(days);

  const exportCsv = () => {
    if (!data) return;
    const header = 'tenant,model,queries,cost_usd,date';
    const rows = data.byTenantByModel.map(
      (r) => `"${r.tenant_name}",${r.model_name},${r.queries},${r.cost_usd.toFixed(6)},${r.date}`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-costs-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const topTenants = useMemo(() => data?.byTenant.slice(0, 5) || [], [data]);
  const topModels = useMemo(() => data?.byModel.slice(0, 5) || [], [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('aiCosts.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('aiCosts.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <TabsList>
              <TabsTrigger value="1">{t('aiCosts.today')}</TabsTrigger>
              <TabsTrigger value="7">{t('aiCosts.last7Days')}</TabsTrigger>
              <TabsTrigger value="30">{t('aiCosts.last30Days')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t('aiCosts.totalSpend')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-3xl font-bold">{formatUsd(data?.total || 0)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t('aiCosts.topTenants')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {topTenants.length === 0 && <span className="text-muted-foreground">—</span>}
            {topTenants.map((t) => (
              <div key={t.tenant_id || 'platform'} className="flex justify-between gap-2">
                <span className="truncate">{t.tenant_name}</span>
                <span className="font-semibold tabular-nums">{formatUsd(t.cost)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t('aiCosts.topModels')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {topModels.length === 0 && <span className="text-muted-foreground">—</span>}
            {topModels.map((m) => (
              <div key={m.model_name} className="flex justify-between gap-2">
                <span className="truncate font-mono text-xs">{m.model_name}</span>
                <span className="font-semibold tabular-nums">{formatUsd(m.cost)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('aiCosts.spendTrend')}</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (data?.byDay.length || 0) === 0 ? (
            <p className="text-muted-foreground text-sm">{t('aiCosts.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data!.byDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} />
                <Tooltip formatter={(v: number) => formatUsd(v)} />
                <Line type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('aiCosts.byTenantByModel')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">{t('aiCosts.queries')}</TableHead>
                    <TableHead className="text-right">{t('aiCosts.cost')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.byTenantByModel || []).slice(0, 50).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.tenant_name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.model_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.queries.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{formatUsd(r.cost_usd)}</TableCell>
                    </TableRow>
                  ))}
                  {(data?.byTenantByModel.length || 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        {t('aiCosts.noData')}
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
