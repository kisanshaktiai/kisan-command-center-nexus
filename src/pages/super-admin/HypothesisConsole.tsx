import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useHypotheses } from '@/hooks/useHypotheses';
import { HypothesisDetailDrawer } from '@/components/governance/HypothesisDetailDrawer';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

const HypothesisConsole: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading } = useHypotheses(search, page);
  const totalPages = data ? Math.ceil(data.count / data.pageSize) : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Hypothesis Console</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of agronomic cause hypotheses with translation coverage.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 flex gap-2">
          <Input
            placeholder="Search hypothesis_id, cause, canonical group"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setSearch(searchInput), setPage(0))}
          />
          <Button onClick={() => { setSearch(searchInput); setPage(0); }} variant="outline">
            <Search className="w-4 h-4 mr-2" /> Search
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{data?.count ?? 0} hypotheses</CardTitle>
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
                  <TableHead>Hypothesis ID</TableHead>
                  <TableHead>Crop Group</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cause (EN)</TableHead>
                  <TableHead>i18n</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                )}
                {!isLoading && data?.rows.map((h) => {
                  const i18nGap = !h.cause_name_hi || !h.cause_name_mr;
                  return (
                    <TableRow
                      key={h.hypothesis_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelected(h.hypothesis_id)}
                    >
                      <TableCell className="font-mono text-xs">{h.hypothesis_id}</TableCell>
                      <TableCell>{h.crop_group || '—'}</TableCell>
                      <TableCell>{h.hypothesis_type || '—'}</TableCell>
                      <TableCell className="max-w-md truncate">{h.cause_name_en || '—'}</TableCell>
                      <TableCell>
                        {i18nGap
                          ? <Badge variant="warning">gap</Badge>
                          : <Badge variant="success">complete</Badge>}
                      </TableCell>
                      <TableCell>
                        {h.is_active ? <Badge variant="success">active</Badge> : <Badge variant="secondary">inactive</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <HypothesisDetailDrawer
        hypothesisId={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
};

export default HypothesisConsole;
