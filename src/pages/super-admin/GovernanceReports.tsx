import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGovernanceReports,
  useRunGovernanceAudit,
  type GovernanceReport,
} from '@/hooks/useGovernanceReports';

const severityStyle = (s: string) => {
  switch (s) {
    case 'critical':
      return { icon: ShieldAlert, cls: 'bg-destructive/10 text-destructive border-destructive/30' };
    case 'warn':
      return { icon: AlertTriangle, cls: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400' };
    default:
      return { icon: ShieldCheck, cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400' };
  }
};

const ReportCard: React.FC<{ report: GovernanceReport }> = ({ report }) => {
  const { icon: Icon, cls } = severityStyle(report.severity);
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center justify-center rounded-md border px-2 py-1 ${cls}`}>
              <Icon className="h-4 w-4" />
            </span>
            <CardTitle className="text-base">{report.title}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {report.report_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{report.summary}</p>
        {Object.keys(report.metrics ?? {}).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(report.metrics).map(([k, v]) => (
              <div key={k} className="rounded-md bg-muted/50 p-2">
                <div className="text-[11px] uppercase text-muted-foreground tracking-wide">{k}</div>
                <div className="text-sm font-semibold">{String(v)}</div>
              </div>
            ))}
          </div>
        )}
        {Array.isArray(report.findings) && report.findings.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              {report.findings.length} finding{report.findings.length === 1 ? '' : 's'}
            </summary>
            <ScrollArea className="mt-2 max-h-48 rounded-md border bg-muted/30 p-2">
              <pre className="text-[11px] leading-relaxed">
                {JSON.stringify(report.findings, null, 2)}
              </pre>
            </ScrollArea>
          </details>
        )}
        <div className="text-[11px] text-muted-foreground">
          Generated {new Date(report.generated_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};

const GovernanceReports: React.FC = () => {
  const { data: reports, isLoading } = useGovernanceReports();
  const runAudit = useRunGovernanceAudit();

  const handleRun = async () => {
    try {
      await runAudit.mutateAsync();
      toast.success('Audit completed');
    } catch (e: any) {
      toast.error(e?.message ?? 'Audit failed');
    }
  };

  // Group: latest snapshot per report_type first
  const latest = React.useMemo(() => {
    const map = new Map<string, GovernanceReport>();
    (reports ?? []).forEach((r) => {
      if (!map.has(r.report_type)) map.set(r.report_type, r);
    });
    return Array.from(map.values());
  }, [reports]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Governance Reports</h1>
          <p className="text-sm text-muted-foreground">
            Forensic audit snapshots of the Decision Brain schema, integrity, and telemetry.
          </p>
        </div>
        <Button onClick={handleRun} disabled={runAudit.isPending}>
          {runAudit.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Run audit
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : latest.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No audits yet. Click <span className="font-medium">Run audit</span> to generate the first snapshot.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {latest.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
};

export default GovernanceReports;
