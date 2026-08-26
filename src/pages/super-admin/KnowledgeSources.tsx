import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookMarked,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AuthorityTierBadge,
  DocTypeBadge,
  ProcessingStatusBadge,
  TopicBadge,
} from '@/components/rag/RagBadges';
import { RagSourceDialog } from '@/components/rag/RagSourceDialog';
import { RagDocumentUploadCard } from '@/components/rag/RagDocumentUploadCard';
import { RagRetrievalStatsStrip } from '@/components/rag/RagRetrievalStatsStrip';
import {
  useRagDocuments,
  useRagSources,
  useRagTopicsLookup,
  useSetRagDocumentActive,
  useUpsertRagSource,
} from '@/hooks/useRagAdmin';
import type { RagSource } from '@/services/ragAdminService';

const ALL = '__all__';
const STATUSES = ['completed', 'processing', 'pending', 'failed'];

export default function KnowledgeSources() {
  const { isSuperAdmin } = useAuth();

  const [days, setDays] = useState(7);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab =
    tabParam === 'upload' || tabParam === 'documents' ? tabParam : 'sources';
  const setTab = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams);
      params.set('tab', next);
      setSearchParams(params, { replace: false });
    },
    [searchParams, setSearchParams]
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RagSource | null>(null);
  const [uploadSource, setUploadSource] = useState<string | undefined>();
  const [docSource, setDocSource] = useState(ALL);
  const [docStatus, setDocStatus] = useState(ALL);
  const [docTopic, setDocTopic] = useState(ALL);
  const topics = useRagTopicsLookup();

  const sourcesQ = useRagSources();
  const upsert = useUpsertRagSource();
  const docsQ = useRagDocuments({
    sourceCode: docSource === ALL ? undefined : docSource,
    status: docStatus === ALL ? undefined : docStatus,
    topicCode: docTopic === ALL ? undefined : docTopic,
  });
  const setActive = useSetRagDocumentActive();

  const sources = useMemo(() => sourcesQ.data?.sources ?? [], [sourcesQ.data]);
  const enums = sourcesQ.data?.enums;
  const documents = docsQ.data?.documents ?? [];

  const totals = useMemo(
    () =>
      sources.reduce(
        (a, s) => ({
          docs: a.docs + s.documents.total,
          completed: a.completed + s.documents.completed,
          failed: a.failed + s.documents.failed,
        }),
        { docs: 0, completed: 0, failed: 0 }
      ),
    [sources]
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (s: RagSource) => {
    setEditing(s);
    setDialogOpen(true);
  };
  const goUpload = (sourceCode: string) => {
    setUploadSource(sourceCode);
    setTab('upload');
  };
  const toggleSourceActive = (s: RagSource, isActive: boolean) =>
    upsert.mutate({
      source_code: s.source_code,
      publisher: s.publisher,
      authority_tier: s.authority_tier,
      doc_type: s.doc_type,
      state_codes: s.state_codes,
      default_language: s.default_language,
      source_url: s.source_url,
      usage_rights: s.usage_rights,
      trust_prior: s.trust_prior,
      notes: s.notes,
      is_active: isActive,
    });

  // Server enforces this regardless; the gate only avoids a confusing 403 toast.
  if (!isSuperAdmin) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Sources</h1>
          <p className="text-sm text-muted-foreground">
            Shared RAG corpus behind the farmer AI advisor.
          </p>
        </div>
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            This console is restricted to super admins. Ask a super admin to
            grant you access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Sources</h1>
          <p className="text-sm text-muted-foreground">
            Shared RAG corpus behind the farmer AI advisor. Register a publisher
            once, then ingest its documents; retrieval ranks by authority tier
            and filters by state and crop.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              sourcesQ.refetch();
              docsQ.refetch();
            }}
            aria-label="Refresh"
          >
            <RefreshCw
              className={
                sourcesQ.isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'
              }
            />
          </Button>
          <Button variant="outline" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New source
          </Button>
          <Button onClick={() => setTab('upload')}>
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload document
          </Button>
        </div>
      </div>

      <RagRetrievalStatsStrip days={days} onDaysChange={setDays} />

      {sourcesQ.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {(sourcesQ.error as Error).message}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sources">
            Sources {sources.length > 0 && `(${sources.length})`}
          </TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="documents">
            Documents {totals.docs > 0 && `(${totals.docs})`}
          </TabsTrigger>
        </TabsList>

        {/* ───────────────────────────── Sources */}
        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookMarked className="h-5 w-5 text-primary" />
                Registered sources
              </CardTitle>
              <CardDescription>
                {totals.completed} document{totals.completed === 1 ? '' : 's'}{' '}
                ready
                {totals.failed > 0 && (
                  <span className="text-[hsl(var(--small-text-destructive))]">
                    {' '}
                    · {totals.failed} failed
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sourcesQ.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : sources.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No sources yet. Register a publisher to start building the
                    corpus.
                  </p>
                  <Button className="mt-4" onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    New source
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Publisher</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Authority</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>States</TableHead>
                      <TableHead className="text-right">Documents</TableHead>
                      <TableHead>Trust</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5">
                            {s.publisher}
                            {s.source_url && (
                              <a
                                href={s.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-primary"
                                aria-label="Open source URL"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {s.source_code}
                        </TableCell>
                        <TableCell>
                          <AuthorityTierBadge tier={s.authority_tier} />
                        </TableCell>
                        <TableCell>
                          <DocTypeBadge docType={s.doc_type} />
                        </TableCell>
                        <TableCell>
                          {s.state_codes?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {s.state_codes.slice(0, 4).map((c) => (
                                <Badge
                                  key={c}
                                  variant="outline"
                                  className="font-mono text-[10px]"
                                >
                                  {c}
                                </Badge>
                              ))}
                              {s.state_codes.length > 4 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  +{s.state_codes.length - 4}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              All India
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <span className="text-[hsl(var(--small-text-success))]">
                                  {s.documents.completed}
                                </span>
                                {s.documents.failed > 0 && (
                                  <span className="text-[hsl(var(--small-text-destructive))]">
                                    {' '}
                                    / {s.documents.failed}
                                  </span>
                                )}
                                <span className="text-muted-foreground">
                                  {' '}
                                  of {s.documents.total}
                                </span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              completed / failed of total
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {s.trust_prior == null
                            ? '—'
                            : s.trust_prior.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={s.is_active !== false}
                            disabled={upsert.isPending}
                            onCheckedChange={(v) => toggleSourceActive(s, v)}
                            aria-label={`Toggle ${s.source_code}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => goUpload(s.source_code)}
                              disabled={s.is_active === false}
                            >
                              <UploadCloud className="mr-1 h-4 w-4" />
                              Upload
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(s)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───────────────────────────── Upload */}
        <TabsContent value="upload">
          {sources.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UploadCloud className="h-5 w-5" />
                  Register a source first
                </CardTitle>
                <CardDescription>
                  Every document belongs to a publisher (ICAR, a state
                  department, a tenant handbook…). Register that source once,
                  then upload its PDFs here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  New source
                </Button>
              </CardContent>
            </Card>
          ) : (
            <RagDocumentUploadCard
              sources={sources}
              initialSourceCode={uploadSource}
            />
          )}
        </TabsContent>

        {/* ───────────────────────────── Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>
                    Inactive documents (and their chunks) are excluded from
                    retrieval.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={docSource} onValueChange={setDocSource}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All sources</SelectItem>
                      {sources.map((s) => (
                        <SelectItem key={s.id} value={s.source_code}>
                          {s.source_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={docTopic} onValueChange={setDocTopic}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All categories</SelectItem>
                      {(topics.data ?? []).map((t) => (
                        <SelectItem key={t.code} value={t.code}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={docStatus} onValueChange={setDocStatus}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All statuses</SelectItem>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {docsQ.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : documents.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No documents match. Upload one from the Upload tab.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Ver</TableHead>
                      <TableHead>Lang</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Chunks</TableHead>
                      <TableHead>Embedding</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((d) => (
                      <TableRow
                        key={d.id}
                        className={d.is_active === false ? 'opacity-60' : ''}
                      >
                        <TableCell className="max-w-[280px]">
                          <p className="truncate font-medium">{d.title}</p>
                          {d.processing_error && (
                            <p className="truncate text-xs text-[hsl(var(--small-text-destructive))]">
                              {d.processing_error}
                            </p>
                          )}
                          {(d.crop_codes?.length ?? 0) > 0 && (
                            <p className="truncate text-xs text-muted-foreground">
                              {d.crop_codes!.join(', ')}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-mono text-xs">
                              {d.rag_source_registry.source_code}
                            </p>
                            <AuthorityTierBadge
                              tier={d.rag_source_registry.authority_tier}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          {(d.topic_codes?.length ?? 0) > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {d.topic_codes!.slice(0, 3).map((c) => (
                                <TopicBadge
                                  key={c}
                                  code={c}
                                  topics={topics.data}
                                />
                              ))}
                              {d.topic_codes!.length > 3 && (
                                <Badge variant="outline" className="text-[10px]">
                                  +{d.topic_codes!.length - 3}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              uncategorised
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {d.doc_version}
                        </TableCell>

                        <TableCell className="font-mono text-xs uppercase">
                          {d.language}
                        </TableCell>
                        <TableCell>
                          {d.tenant_id ? (
                            <Badge variant="secondary">tenant</Badge>
                          ) : (
                            <Badge variant="outline">global</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <ProcessingStatusBadge status={d.processing_status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {d.chunk_count ?? 0}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {d.embedding_model ? (
                            d.embedding_model
                          ) : d.processing_status === 'completed' ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help text-[hsl(var(--small-text-warning))]">
                                  not embedded · fulltext only
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                Chunks were stored without vectors, so semantic
                                (vector) retrieval cannot match this document —
                                only keyword/fulltext search can. Configure the
                                embedding provider on rag-ingest and re-ingest.
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            '—'
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {d.created_at
                            ? new Date(d.created_at).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={d.is_active !== false}
                            disabled={
                              setActive.isPending ||
                              d.processing_status !== 'completed'
                            }
                            onCheckedChange={(v) =>
                              setActive.mutate({
                                documentId: d.id,
                                isActive: v,
                              })
                            }
                            aria-label={`Toggle ${d.title}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RagSourceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        source={editing}
        enums={enums}
      />
    </div>
  );
}
