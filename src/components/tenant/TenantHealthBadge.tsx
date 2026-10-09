import React from 'react';
import { Badge } from '@/components/ui/badge';
import { healthBand } from '@/services/TenantHealthService';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface Props {
  score?: number | null;
  className?: string;
  showLabel?: boolean;
}

export function TenantHealthBadge({ score, className, showLabel = true }: Props) {
  const { t } = useTranslation('admin');
  if (score == null) {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        —
      </Badge>
    );
  }
  const band = healthBand(score);
  const styles: Record<typeof band, string> = {
    good: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
    critical: 'bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-400',
  };
  const labels: Record<typeof band, string> = {
    good: t('health.good'),
    warning: t('health.warning'),
    critical: t('health.critical'),
  };
  return (
    <Badge variant="outline" className={cn('font-semibold gap-1', styles[band], className)}>
      <span>{Math.round(score)}</span>
      {showLabel && <span className="text-xs opacity-80">· {labels[band]}</span>}
    </Badge>
  );
}
