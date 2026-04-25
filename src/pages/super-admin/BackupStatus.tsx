import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { BackupService, type BackupEvent } from '@/services/BackupService';

const SUPABASE_BACKUPS_URL = `https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_PROJECT_ID}/database/backups`;

const formatBytes = (b: number | null) => {
  if (!b) return '—';
  const mb = b / 1024 / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
};

function StatusBadge({ status }: { status: BackupEvent['status'] }) {
  const map = {
    succeeded: { icon: CheckCircle2, cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
    failed: { icon: XCircle, cls: 'bg-rose-500/15 text-rose-700 border-rose-500/30' },
    running: { icon: Clock, cls: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  } as const;
  const { icon: Icon, cls } = map[status];
  return (
    <Badge variant="outline" className={`gap-1 ${cls}`}>
      <Icon className="h-3 w-3" /> {status}
    </Badge>
  );
}

export default function BackupStatus() {
  const { t } = useTranslation('admin');

  const { data: events, isLoading } = useQuery({
    queryKey: ['backup-events'],
    queryFn: () => BackupService.list(50),
    staleTime: 60_000,
  });

  const { data: last } = useQuery({
    queryKey: ['backup-events', 'last-successful'],
    queryFn: () => BackupService.lastSuccessful(),
    staleTime: 60_000,
  });

  const ageHours = last ? Math.floor((Date.now() - new Date(last.started_at).getTime()) / 3_600_000) : null;
  const stale = ageHours == null || ageHours > 26;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('backups.title')}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">{t('backups.subtitle')}</p>
        </div>
        <Button asChild variant="outline">
          <a href={SUPABASE_BACKUPS_URL} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" /> {t('backups.openSupabase')}
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t('backups.lastSuccessful')}</CardTitle>
          </CardHeader>
          <CardContent>
            {ageHours == null ? (
              <div className="text-muted-foreground">—</div>
            ) : (
              <>
                <div className="text-3xl font-bold">{t('backups.ageHours', { hours: ageHours })}</div>
                <div className="mt-1">
                  {stale ? (
                    <Badge variant="outline" className="bg-rose-500/15 text-rose-700 border-rose-500/30 gap-1">
                      <AlertTriangle className="h-3 w-3" /> {t('backups.stale')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                      {t('backups.fresh')}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t('backups.storageUsed')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatBytes((events || []).reduce((s, e) => s + (e.size_bytes || 0), 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Events tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{events?.length ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('backups.timeline')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (events?.length || 0) === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No backup events recorded yet. The daily sync edge function will populate this once configured.
            </div>
          ) : (
            <div className="space-y-2">
              {events!.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between border rounded-md px-3 py-2 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusBadge status={e.status} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{t(`backups.kind.${e.kind}`)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.started_at).toLocaleString()} · {formatBytes(e.size_bytes)}
                      </div>
                    </div>
                  </div>
                  {e.notes && <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-xs">{e.notes}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
