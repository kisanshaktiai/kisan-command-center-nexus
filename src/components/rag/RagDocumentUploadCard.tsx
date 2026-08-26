import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  FolderTree,
  Loader2,
  ScanLine,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CodeMultiSelect } from './CodeMultiSelect';
import { humanizeCode, TopicBadge } from './RagBadges';
import {
  useRagCropsLookup,
  useRagStatesLookup,
  useRagTenantsLookup,
  useRagTopicsLookup,
  useRagUploadAndIngest,
} from '@/hooks/useRagAdmin';
import {
  RAG_INGESTABLE_EXTENSIONS,
  RAG_DOC_TYPES,
  previewStoragePath,
  suggestTopics,
  type RagDocType,
  type RagIngestResult,
  type RagSource,
  type RagUploadStage,
} from '@/services/ragAdminService';

interface RagDocumentUploadCardProps {
  sources: RagSource[];
  /** Pre-select a source (e.g. from the sources table "Upload" action). */
  initialSourceCode?: string;
}

const STAGES: { key: RagUploadStage; label: string; pct: number }[] = [
  { key: 'signing', label: 'Requesting signed upload URL', pct: 20 },
  { key: 'uploading', label: 'Uploading to private bucket', pct: 55 },
  { key: 'ingesting', label: 'Parsing, chunking & embedding', pct: 85 },
];

const ACCEPT = RAG_INGESTABLE_EXTENSIONS.map((e) => `.${e}`).join(',');

export function RagDocumentUploadCard({
  sources,
  initialSourceCode,
}: RagDocumentUploadCardProps) {
  const activeSources = useMemo(
    () => sources.filter((s) => s.is_active !== false),
    [sources]
  );

  const [sourceCode, setSourceCode] = useState(initialSourceCode ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [docVersion, setDocVersion] = useState('1');
  const [language, setLanguage] = useState('en');
  const [publicationDate, setPublicationDate] = useState('');
  const [docType, setDocType] = useState<RagDocType | ''>('');
  const [stateCodes, setStateCodes] = useState<string[]>([]);
  const [cropCodes, setCropCodes] = useState<string[]>([]);
  const [topicCodes, setTopicCodes] = useState<string[]>([]);
  const [scope, setScope] = useState<'global' | 'tenant'>('global');
  const [tenantId, setTenantId] = useState('');
  const [embed, setEmbed] = useState(true);
  const [result, setResult] = useState<RagIngestResult | null>(null);

  const states = useRagStatesLookup();
  const crops = useRagCropsLookup();
  const tenants = useRagTenantsLookup();
  const topics = useRagTopicsLookup();
  const upload = useRagUploadAndIngest();

  const topicOptions = useMemo(
    () => (topics.data ?? []).map((t) => ({ value: t.code, label: t.label })),
    [topics.data]
  );
  // Auto-suggest categories from the file name + title via rag_topics.aliases.
  const suggested = useMemo(
    () =>
      topics.data && (file || title)
        ? suggestTopics(`${file?.name ?? ''} ${title}`, topics.data).filter(
            (c) => !topicCodes.includes(c)
          )
        : [],
    [topics.data, file, title, topicCodes]
  );
  const primaryTopic = topics.data?.find((t) => t.code === topicCodes[0]);

  const source = activeSources.find((s) => s.source_code === sourceCode);

  useEffect(() => {
    if (initialSourceCode) setSourceCode(initialSourceCode);
  }, [initialSourceCode]);

  // Defaults inherited from the source: jurisdiction, language, doc type
  useEffect(() => {
    if (!source) return;
    setStateCodes(source.state_codes ?? []);
    setLanguage(source.default_language || 'en');
    setDocType(source.doc_type);
  }, [source]);

  const ext = file?.name.split('.').pop()?.toLowerCase() ?? '';
  const extOk = (RAG_INGESTABLE_EXTENSIONS as readonly string[]).includes(ext);
  const canSubmit =
    !!source &&
    !!file &&
    extOk &&
    title.trim().length > 0 &&
    topicCodes.length > 0 &&
    (scope === 'global' || !!tenantId) &&
    !upload.isPending;

  const handleFile = (f: File | null) => {
    setFile(f);
    setResult(null);
    if (f && !title)
      setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
  };

  const handleSubmit = async () => {
    if (!file || !source) return;
    setResult(null);
    const r = await upload.mutateAsync({
      file,
      meta: {
        sourceCode: source.source_code,
        title: title.trim(),
        topicCodes,
        docVersion: docVersion.trim() || '1',
        language: language.trim() || 'en',
        stateCodes: stateCodes.length ? stateCodes : undefined,
        cropCodes: cropCodes.length ? cropCodes : undefined,
        docType: docType || undefined,
        publicationDate: publicationDate || undefined,
        tenantId: scope === 'tenant' ? tenantId : null,
        embed,
      },
    });
    setResult(r);
    if (!r.error && r.processing_status !== 'failed') {
      setFile(null);
      setTitle('');
      setCropCodes([]);
      setTopicCodes([]);
    }
  };

  const stageIdx = STAGES.findIndex((s) => s.key === upload.stage);
  const failed =
    !!result && (result.processing_status === 'failed' || !!result.error);
  const needsOcr =
    failed &&
    /SCANNED_OR_EMPTY_PDF/i.test(
      result?.processing_error ?? result?.error ?? ''
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-primary" />
          Upload document
        </CardTitle>
        <CardDescription>
          File goes to the private{' '}
          <code className="font-mono">rag-documents</code> bucket via a
          short-lived signed URL, then{' '}
          <code className="font-mono">rag-ingest</code> parses and chunks it.
          PDF is supported now; Markdown and text after the ingest extension.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Source</Label>
            <Select value={sourceCode} onValueChange={setSourceCode}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a registered source…" />
              </SelectTrigger>
              <SelectContent>
                {activeSources.map((s) => (
                  <SelectItem key={s.id} value={s.source_code}>
                    <span className="font-mono text-xs mr-2">
                      {s.source_code}
                    </span>
                    <span className="text-muted-foreground">{s.publisher}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeSources.length === 0 && (
              <p className="text-xs text-[hsl(var(--small-text-warning))]">
                No active sources. Create one first — documents cannot exist
                without a source.
              </p>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="rag-file">File</Label>
            <label
              htmlFor="rag-file"
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 transition-colors',
                file ? 'border-primary/50 bg-primary/5' : 'hover:bg-muted/50',
                upload.isPending && 'pointer-events-none opacity-60'
              )}
            >
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                {file ? (
                  <>
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB ·{' '}
                      {extOk ? ext.toUpperCase() : 'unsupported type'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">Choose a file</p>
                    <p className="text-xs text-muted-foreground">
                      {RAG_INGESTABLE_EXTENSIONS.map((e) => `.${e}`).join(' · ')} ·
                      up to 50 MB
                    </p>
                  </>
                )}
              </div>
            </label>
            <input
              id="rag-file"
              type="file"
              accept={ACCEPT}
              className="sr-only"
              disabled={upload.isPending}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {file && !extOk && (
              <p className="text-xs text-[hsl(var(--small-text-destructive))]">
                Only {RAG_INGESTABLE_EXTENSIONS.join(', ')} files can be ingested
                today.
              </p>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="rag-title">Title</Label>
            <Input
              id="rag-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sugarcane package of practices 2024–25"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Category</Label>
              <span className="text-xs text-muted-foreground">
                first selected = primary → storage folder
              </span>
            </div>
            <CodeMultiSelect
              options={topicOptions}
              value={topicCodes}
              onChange={setTopicCodes}
              placeholder={
                topics.isLoading
                  ? 'Loading categories…'
                  : 'Seeds · Fertilizer · Weed control · Herbicides · Pesticides…'
              }
              disabled={topics.isLoading}
              showCode={false}
            />
            {suggested.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Suggested from file name:
                </span>
                {suggested.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTopicCodes((prev) => [...prev, c])}
                    className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <TopicBadge code={c} topics={topics.data} />
                  </button>
                ))}
              </div>
            )}
            {topicCodes.length === 0 && (
              <p className="text-xs text-muted-foreground">
                At least one category is required — retrieval filters by it and
                the file is stored under its folder.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rag-version">Version</Label>
            <Input
              id="rag-version"
              value={docVersion}
              onChange={(e) => setDocVersion(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rag-doc-lang">Language</Label>
            <Input
              id="rag-doc-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              maxLength={8}
              placeholder="en"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rag-pubdate">Publication date</Label>
            <Input
              id="rag-pubdate"
              type="date"
              value={publicationDate}
              onChange={(e) => setPublicationDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Document type</Label>
            <Select
              value={docType}
              onValueChange={(v) => setDocType(v as RagDocType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Inherit from source" />
              </SelectTrigger>
              <SelectContent>
                {RAG_DOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {humanizeCode(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>States</Label>
            <CodeMultiSelect
              options={(states.data ?? []).map((s) => ({
                value: s.code,
                label: s.name,
              }))}
              value={stateCodes}
              onChange={setStateCodes}
              placeholder="Inherited from source"
              disabled={states.isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Crops</Label>
            <CodeMultiSelect
              options={crops.data ?? []}
              value={cropCodes}
              onChange={setCropCodes}
              placeholder={crops.isLoading ? 'Loading crops…' : 'All crops'}
              disabled={crops.isLoading}
            />
          </div>

          {source && primaryTopic && (file || title) && (
            <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 md:col-span-2">
              <FolderTree className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Will be stored as
                </p>
                <p className="break-all font-mono text-xs">
                  rag-documents/
                  {previewStoragePath({
                    sourceCode: source.source_code,
                    topicDir: primaryTopic.storage_dir,
                    title,
                    fileName: file?.name ?? 'document.pdf',
                    docVersion,
                    language,
                  })}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <Label>Corpus scope</Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as 'global' | 'tenant')}
              className="grid gap-2 md:grid-cols-2"
            >
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
                  scope === 'global' && 'border-primary bg-primary/5'
                )}
              >
                <RadioGroupItem value="global" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Global corpus</p>
                  <p className="text-xs text-muted-foreground">
                    Shared with every tenant (<code>tenant_id = NULL</code>).
                  </p>
                </div>
              </label>
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
                  scope === 'tenant' && 'border-primary bg-primary/5'
                )}
              >
                <RadioGroupItem value="tenant" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Tenant-only</p>
                  <p className="text-xs text-muted-foreground">
                    Visible to one tenant.
                  </p>
                </div>
              </label>
            </RadioGroup>
            {scope === 'tenant' && (
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      tenants.isLoading ? 'Loading tenants…' : 'Select tenant'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(tenants.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}{' '}
                      <span className="font-mono text-xs text-muted-foreground">
                        {t.slug}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <Checkbox
              id="rag-embed"
              checked={embed}
              onCheckedChange={(v) => setEmbed(v === true)}
            />
            <Label htmlFor="rag-embed">
              Embed now (chunks become retrievable immediately)
            </Label>
          </div>
        </div>

        {upload.isPending && (
          <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="font-medium">
                {STAGES[stageIdx]?.label ?? 'Starting…'}
              </span>
            </div>
            <Progress value={STAGES[stageIdx]?.pct ?? 5} />
            <div className="flex justify-between text-xs text-muted-foreground">
              {STAGES.map((s, i) => (
                <span
                  key={s.key}
                  className={cn(i <= stageIdx && 'text-foreground font-medium')}
                >
                  {s.key}
                </span>
              ))}
            </div>
          </div>
        )}

        {result && !failed && result.deduplicated && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Already in the corpus</AlertTitle>
            <AlertDescription>
              An identical file (same content hash) was ingested earlier, so no
              new document was created. The categories you chose were merged
              onto the existing document.
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {result.documentId}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {result && !failed && !result.deduplicated && (
          <Alert className="border-success/40 bg-success/5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle>Ingested</AlertTitle>
            <AlertDescription>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Pages" value={result.pages} />
                <Stat label="Chunks" value={result.chunks} />
                <Stat label="Sections" value={result.sectionsDetected} />
                <Stat label="Tables" value={result.tables} />
              </div>
              {result.topic_codes && result.topic_codes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {result.topic_codes.map((c, i) => (
                    <TopicBadge
                      key={c}
                      code={c}
                      topics={topics.data}
                      primary={i === 0}
                    />
                  ))}
                </div>
              )}
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {result.documentId} · {result.processing_status}
                {result.embedding && ` · ${result.embedding}`}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {result && failed && (
          <Alert variant="destructive">
            {needsOcr ? (
              <ScanLine className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertTitle>
              {needsOcr ? 'Needs OCR' : 'Processing failed'}
            </AlertTitle>
            <AlertDescription>
              {needsOcr
                ? 'No extractable text was found — this looks like a scanned PDF. Run it through OCR (e.g. ocrmypdf) and re-upload the text layer.'
                : (result.processing_error ?? result.error ?? 'Unknown error')}
              {result.documentId && (
                <p className="mt-1 font-mono text-xs opacity-80">
                  {result.documentId}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {upload.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            {upload.isPending ? 'Working…' : 'Upload & ingest'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background p-2 text-center">
      <p className="text-lg font-semibold tabular-nums">{value ?? 0}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
