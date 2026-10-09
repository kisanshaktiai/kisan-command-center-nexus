import { Badge } from '@/components/ui/badge';
import type {
  RagAuthorityTier,
  RagProcessingStatus,
  RagTopic,
} from '@/services/ragAdminService';

/**
 * Colour mapping is intentional: it encodes retrieval rank.
 * `authority_tier` drives AUTHORITY_BOOST in ragRetrieval.ts, so the most
 * trusted tiers get the strongest (primary/success) treatment and `other`
 * stays neutral. Only theme tokens are used — no hardcoded hex.
 */
const TIER_STYLE: Record<
  RagAuthorityTier,
  { label: string; className: string }
> = {
  central_govt: {
    label: 'Central Govt',
    className:
      'border-transparent bg-primary text-primary-foreground hover:bg-primary/90',
  },
  icar: {
    label: 'ICAR',
    className:
      'border-transparent bg-success text-success-foreground hover:bg-success/90',
  },
  state_agri_university: {
    label: 'State Agri Univ',
    className:
      'border-transparent bg-info/15 text-[hsl(var(--small-text-info))]',
  },
  state_govt: {
    label: 'State Govt',
    className:
      'border-transparent bg-info/15 text-[hsl(var(--small-text-info))]',
  },
  kvk: {
    label: 'KVK',
    className:
      'border-transparent bg-warning/20 text-[hsl(var(--small-text-warning))]',
  },
  other: { label: 'Other', className: '' },
};

export function AuthorityTierBadge({
  tier,
}: {
  tier: RagAuthorityTier | string;
}) {
  const s = TIER_STYLE[tier as RagAuthorityTier];
  if (!s) return <Badge variant="outline">{tier}</Badge>;
  return (
    <Badge
      variant={tier === 'other' ? 'outline' : 'default'}
      className={s.className}
    >
      {s.label}
    </Badge>
  );
}

export const humanizeCode = (v: string | null | undefined) =>
  (v ?? '—').replace(/_/g, ' ');

export function DocTypeBadge({
  docType,
}: {
  docType: string | null | undefined;
}) {
  return (
    <Badge variant="outline" className="capitalize">
      {humanizeCode(docType)}
    </Badge>
  );
}

export function ProcessingStatusBadge({
  status,
}: {
  status: RagProcessingStatus;
}) {
  switch (status) {
    case 'completed':
      return <Badge variant="success">completed</Badge>;
    case 'failed':
      return <Badge variant="destructive">failed</Badge>;
    case 'processing':
    case 'pending':
      return <Badge variant="warning">{status}</Badge>;
    default:
      return <Badge variant="outline">{status || 'unknown'}</Badge>;
  }
}

/**
 * Topic (category) chips. Group colour is stable across the panel so a
 * "protection" topic (weeds, pests, diseases) always reads the same way.
 */
const TOPIC_GROUP_CLASS: Record<string, string> = {
  inputs:
    'border-transparent bg-success/15 text-[hsl(var(--small-text-success))]',
  protection:
    'border-transparent bg-warning/20 text-[hsl(var(--small-text-warning))]',
  agronomy: 'border-transparent bg-info/15 text-[hsl(var(--small-text-info))]',
  economics: 'border-transparent bg-primary/10 text-primary',
};

export function TopicBadge({
  code,
  topics,
  primary,
}: {
  code: string;
  topics?: RagTopic[];
  /** first code = storage folder; rendered slightly stronger */
  primary?: boolean;
}) {
  const t = topics?.find((x) => x.code === code);
  const cls = t ? (TOPIC_GROUP_CLASS[t.topic_group] ?? '') : '';
  return (
    <Badge
      variant="outline"
      className={`${cls} ${primary ? 'ring-1 ring-current/30' : ''} font-normal`}
      title={t ? `${t.label} · ${t.topic_group}` : code}
    >
      {t?.label ?? code}
    </Badge>
  );
}
