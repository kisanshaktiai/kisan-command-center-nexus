import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useDecisionRules, RulesFilters } from '@/hooks/useDecisionRules';
import { RuleDetailDrawer } from '@/components/governance/RuleDetailDrawer';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

const RulesConsole: React.FC = () => {
  const [filters, setFilters] = useState<RulesFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<{ uuid: string; textId: string } | null>(null);

  const { data, isLoading } = useDecisionRules(filters, page);
  const totalPages = data ? Math.ceil(data.count / data.pageSize) : 0;

  const applySearch = () => {
    setFilters((f) => ({ ...f, search: searchInput || undefined }));
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Decision Rules Console</h1>
        <p className="text-sm text-muted-foreground">
          Read-only governance view. Inspect telemetry, conflicts, lineage, and version history.
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
                  <TableHead>Rule ID</TableHead>
                  <TableHead>Crop</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>IPM</TableHead>
                  <TableHead>Bee</TableHead>
                  <TableHead>Conf</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                )}
                {!isLoading && data?.rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelected({ uuid: r.id, textId: r.rule_id })}
                  >
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
