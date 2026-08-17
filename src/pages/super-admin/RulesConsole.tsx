import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useDecisionRules, RulesFilters } from '@/hooks/useDecisionRules';
import { useBulkTransition, type BulkTransitionResult } from '@/hooks/useGovernanceMutations';
import { RuleDetailDrawer } from '@/components/governance/RuleDetailDrawer';
import { ChevronLeft, ChevronRight, Search, Eye, AlertTriangle } from 'lucide-react';

const RulesConsole: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<RulesFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<{ uuid: string; textId: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkNote, setBulkNote] = useState('');
  const [bulkResults, setBulkResults] = useState<BulkTransitionResult[] | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const { data, isLoading } = useDecisionRules(filters, page);
  const bulk = useBulkTransition();
  const totalPages = data ? Math.ceil(data.count / data.pageSize) : 0;
  const rows = data?.rows ?? [];

  const allOnPageSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => selectedIds.includes(r.id)),
    [rows, selectedIds]
  );

  const toggleAllOnPage = (checked: boolean) => {
    setSelectedIds((prev) =>
      checked
        ? Array.from(new Set([...prev, ...rows.map((r) => r.id)]))
        : prev.filter((id) => !rows.some((r) => r.id === id))
    );
  };

  const toggleOne = (id: string, checked: boolean) =>
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  const applySearch = () => {
    setFilters((f) => ({ ...f, search: searchInput || undefined }));
    setPage(0);
  };

  const runBulk = () => {
    setBulkError(null);
    setBulkResults(null);
    if (!bulkNote.trim()) {
      setBulkError('Enter the source you verified these rules against.');
      return;
    }
    bulk.mutate(
      {
        ruleUuids: selectedIds,
        newState: 'approved',
        note: `Verified against: ${bulkNote.trim()}`,
      },
      {
        onSuccess: (res) => setBulkResults(res),
        onError: (e: any) => setBulkError(e?.message || 'Bulk approval failed'),
      }
    );
  };

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-2xl font-bold">Decision Rules Console</h1>
        <p className="text-sm text-muted-foreground">
          Governance view. Inspect telemetry, conflicts, lineage, and version history; open a rule for full agronomist review.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2 flex gap-2">
            <Input
              placeholder="Search rule_id or crop_code"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            />
            <Button onClick={applySearch} size="icon" variant="outline"><Search className="w-4 h-4" /></Button>
          </div>
          <Select value={filters.cropCode || 'all'} onValueChange={(v) => { setFilters({ ...filters, cropCode: v === 'all' ? undefined : v }); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Crop" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Crop: All</SelectItem>
              {(facets?.crops || []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.category || 'all'} onValueChange={(v) => { setFilters({ ...filters, category: v === 'all' ? undefined : v }); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Category: All</SelectItem>
              {(facets?.categories || []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.actionType || 'all'} onValueChange={(v) => { setFilters({ ...filters, actionType: v === 'all' ? undefined : v }); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Action: All</SelectItem>
              {(facets?.actions || []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.ipmLevel || 'all'} onValueChange={(v) => { setFilters({ ...filters, ipmLevel: v === 'all' ? undefined : v }); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="IPM Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">IPM: All</SelectItem>
              {[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>IPM {n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.beeToxicity || 'all'} onValueChange={(v) => { setFilters({ ...filters, beeToxicity: v === 'all' ? undefined : v }); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Bee Toxicity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bee: All</SelectItem>
              {['low','medium','high','none'].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.expertApproved || 'all'} onValueChange={(v) => { setFilters({ ...filters, expertApproved: v === 'all' ? undefined : v }); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Approved" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Approved: All</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.active || 'all'} onValueChange={(v) => { setFilters({ ...filters, active: v === 'all' ? undefined : v }); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Active" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Active: All</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{data?.count ?? 0} rules</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">{page + 1} / {Math.max(totalPages, 1)}</span>
            <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={(c) => toggleAllOnPage(!!c)}
                      aria-label="Select all on page"
                    />
                  </TableHead>
                  <TableHead>Rule ID</TableHead>
                  <TableHead>Crop</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>IPM</TableHead>
                  <TableHead>Bee</TableHead>
                  <TableHead>Conf</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                )}
                {!isLoading && rows.map((r, i) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      navigate(`/super-admin/governance/review/${r.id}`, {
                        state: { queue: rows.map((x) => x.id), index: i },
                      })
                    }
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(r.id)}
                        onCheckedChange={(c) => toggleOne(r.id, !!c)}
                        aria-label={`Select ${r.rule_id}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.rule_id}</TableCell>
                    <TableCell>{r.crop_code || '—'}</TableCell>
                    <TableCell>{r.category || '—'}</TableCell>
                    <TableCell>{r.action_type || '—'}</TableCell>
                    <TableCell>{r.ipm_level ?? '—'}</TableCell>
                    <TableCell>{r.bee_toxicity || '—'}</TableCell>
                    <TableCell>{r.confidence_score ?? '—'}</TableCell>
                    <TableCell>
                      {r.is_active ? <Badge variant="success">active</Badge> : <Badge variant="secondary">inactive</Badge>}
                      {r.expert_approved && <Badge className="ml-1" variant="default">✓</Badge>}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          navigate(`/super-admin/governance/review/${r.id}`, {
                            state: { queue: rows.map((x) => x.id), index: i },
                          })
                        }
                      >
                        <Eye className="w-3 h-3 mr-1" />Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>Clear</Button>
            <Button size="sm" onClick={() => { setBulkOpen(true); setBulkResults(null); setBulkError(null); }}>
              Approve {selectedIds.length} selected
            </Button>
          </div>
        </div>
      )}

      <Dialog open={bulkOpen} onOpenChange={(o) => { setBulkOpen(o); if (!o) { setBulkNote(''); setBulkResults(null); setBulkError(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve {selectedIds.length} rules</DialogTitle>
            <DialogDescription>
              Bulk approval runs the same safety checks per rule. Rules that fail (missing PHI/dose,
              open blocking finding, or maker=checker) will be skipped and reported.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            rows={3}
            placeholder="Verified against (source) — required"
            value={bulkNote}
            onChange={(e) => setBulkNote(e.target.value)}
          />

          {bulkError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-wrap">{bulkError}</AlertDescription>
            </Alert>
          )}

          {bulkResults && (
            <div className="max-h-60 overflow-y-auto space-y-1 text-sm border rounded p-2">
              {bulkResults.length === 0 && (
                <div className="text-muted-foreground">No results returned.</div>
              )}
              {bulkResults.map((res, i) => {
                const ok = /approved|success|ok/i.test(res.result || '');
                return (
                  <div key={`${res.rule_id}-${i}`} className={ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}>
                    {ok ? '✓' : '✗'} <span className="font-mono text-xs">{res.rule_id}</span> — {res.result}
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Close</Button>
            <Button onClick={runBulk} disabled={bulk.isPending}>
              {bulk.isPending ? 'Approving…' : 'Confirm approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RuleDetailDrawer
        ruleUuid={selected?.uuid ?? null}
        ruleTextId={selected?.textId ?? null}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
};

export default RulesConsole;
