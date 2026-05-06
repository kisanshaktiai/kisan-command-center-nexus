import React, { useMemo, useState } from 'react';
import { AdminAuthWrapper } from '@/components/auth/AdminAuthWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useApprovalQueue, useTransitionApproval } from '@/hooks/useGovernanceMutations';
import { format } from 'date-fns';
import { ClipboardCheck, ArrowRight } from 'lucide-react';

const COLUMNS: Array<{ key: string; label: string; next?: string[] }> = [
  { key: 'draft', label: 'Draft', next: ['review', 'rejected'] },
  { key: 'review', label: 'In Review', next: ['approved', 'rejected', 'draft'] },
  { key: 'approved', label: 'Approved', next: ['published', 'deprecated'] },
  { key: 'published', label: 'Published', next: ['deprecated'] },
  { key: 'deprecated', label: 'Deprecated' },
  { key: 'rejected', label: 'Rejected' },
];

export default function ApprovalQueue() {
  const { data: rows, isLoading } = useApprovalQueue('all');
  const transition = useTransitionApproval();
  const [active, setActive] = useState<{ id: string; nextState: string } | null>(null);
  const [notes, setNotes] = useState('');

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    COLUMNS.forEach(c => (g[c.key] = []));
    (rows || []).forEach((r: any) => {
      if (!g[r.state]) g[r.state] = [];
      g[r.state].push(r);
    });
    return g;
  }, [rows]);

  const handleSubmit = () => {
    if (!active) return;
    transition.mutate(
      { workflowId: active.id, newState: active.nextState, notes: notes || undefined },
      { onSuccess: () => { setActive(null); setNotes(''); } }
    );
  };

  return (
    <AdminAuthWrapper requiredRole="super_admin">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Approval Queue</h1>
            <p className="text-sm text-muted-foreground">
              Rule change workflow. Transitions are audited; published changes still require manual rule write.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {COLUMNS.map(col => (
              <Card key={col.key} className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    {col.label}
                    <Badge variant="secondary">{grouped[col.key]?.length ?? 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {(grouped[col.key] || []).map((r: any) => (
                    <Card key={r.id} className="bg-background">
                      <CardContent className="p-3 text-xs space-y-2">
                        <div className="font-mono truncate" title={r.rule_id}>{r.rule_id?.slice(0, 8)}…</div>
                        <div className="text-muted-foreground">{format(new Date(r.updated_at || r.created_at), 'PP p')}</div>
                        {r.agronomist_notes && (
                          <div className="text-foreground line-clamp-2">{r.agronomist_notes}</div>
                        )}
                        {col.next && col.next.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {col.next.map(n => (
                              <Button
                                key={n} size="sm" variant="outline"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => { setActive({ id: r.id, nextState: n }); setNotes(''); }}
                              >
                                <ArrowRight className="h-3 w-3 mr-1" />{n}
                              </Button>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {(grouped[col.key]?.length ?? 0) === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4">Empty</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transition to: {active?.nextState}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Reviewer notes (optional)…"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={transition.isPending}>
              {transition.isPending ? 'Updating…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminAuthWrapper>
  );
}
