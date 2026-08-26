import { Activity, Gauge, Languages, SearchX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useRagRetrievalStats } from '@/hooks/useRagAdmin';

interface RagRetrievalStatsStripProps {
  days: number;
  onDaysChange: (days: number) => void;
}

export function RagRetrievalStatsStrip({
  days,
  onDaysChange,
}: RagRetrievalStatsStripProps) {
  const { data, isLoading } = useRagRetrievalStats(days);

  const total = Number(data?.total ?? 0);
  const belowThreshold = Number(data?.below_threshold ?? 0);
  const avgLatency = Number(data?.avg_latency_ms ?? 0);
  const gapRate = Number(data?.gap_rate ?? 0);
  const gapPct = data ? Math.round((Number.isFinite(gapRate) ? gapRate : 0) * 100) : 0;
  // Corpus-gap rate is the one number that should change colour: it is the
  // signal that farmers are asking things the knowledge base cannot answer.
  const gapTone =
    gapPct >= 30
      ? 'text-[hsl(var(--small-text-destructive))]'
      : gapPct >= 15
        ? 'text-[hsl(var(--small-text-warning))]'
        : 'text-[hsl(var(--small-text-success))]';

  const langs = Object.entries(data?.by_language ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          Retrieval activity
        </p>
        <Select
          value={String(days)}
          onValueChange={(v) => onDaysChange(Number(v))}
        >
          <SelectTrigger className="h-8 w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 7, 30, 90].map((d) => (
              <SelectItem key={d} value={String(d)}>
                Last {d} {d === 1 ? 'day' : 'days'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Retrievals"
          loading={isLoading}
          value={data ? total.toLocaleString() : '—'}
          hint="queries answered from the corpus"
        />
        <StatCard
          icon={SearchX}
          label="Corpus-gap rate"
          loading={isLoading}
          value={data ? `${gapPct}%` : '—'}
          valueClassName={gapTone}
          hint={
            data ? `${belowThreshold.toLocaleString()} below threshold` : ''
          }
        />
        <StatCard
          icon={Languages}
          label="By language"
          loading={isLoading}
          value={
            langs.length ? (
              <span className="flex flex-wrap gap-x-2 text-base">
                {langs.map(([l, n]) => (
                  <span key={l}>
                    <span className="font-mono uppercase">{l}</span>{' '}
                    <span className="text-muted-foreground">{n}</span>
                  </span>
                ))}
              </span>
            ) : (
              '—'
            )
          }
          hint="top query languages"
        />
        <StatCard
          icon={Gauge}
          label="Avg latency"
          loading={isLoading}
          value={data ? `${data.avg_latency_ms} ms` : '—'}
          hint="end-to-end retrieval"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  loading,
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: string;
  loading?: boolean;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-20" />
          ) : (
            <div
              className={cn(
                'text-2xl font-semibold tabular-nums',
                valueClassName
              )}
            >
              {value}
            </div>
          )}
          {hint && !loading && (
            <p className="text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
