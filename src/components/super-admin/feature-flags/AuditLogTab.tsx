import { useQuery } from '@tanstack/react-query';
import { EnhancedFeatureService } from '@/services/EnhancedFeatureService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { History, User } from 'lucide-react';

export function AuditLogTab() {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['feature-flag-audit-log'],
    queryFn: () => EnhancedFeatureService.getAuditLog()
  });

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      created: 'bg-success/10 text-success',
      enabled: 'bg-success/10 text-success',
      disabled: 'bg-destructive/10 text-destructive',
      updated: 'bg-warning/10 text-warning',
      archived: 'bg-muted text-muted-foreground',
      rollout_changed: 'bg-info/10 text-info',
      targeting_changed: 'bg-info/10 text-info'
    };
    return colors[action] || 'bg-muted text-muted-foreground';
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading audit log...</div>;
  }

  if (!auditLogs || auditLogs.length === 0) {
    return (
      <Card className="p-12 text-center">
        <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No audit log entries yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {auditLogs.map((log) => (
        <Card key={log.id} className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge className={getActionColor(log.action)}>
                  {log.action.replace('_', ' ').toUpperCase()}
                </Badge>
                <span className="font-semibold text-foreground">
                  {log.feature_flags?.flag_name || 'Unknown Flag'}
                </span>
              </div>
              
              {log.change_reason && (
                <p className="text-sm text-muted-foreground mb-2">
                  Reason: {log.change_reason}
                </p>
              )}
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Changed by: {log.changed_by || 'System'}</span>
                <span>•</span>
                <span>{format(new Date(log.created_at), 'PPp')}</span>
              </div>

              {log.old_value && log.new_value && (
                <div className="mt-3 p-3 bg-muted rounded-md text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold mb-1">Old Value:</p>
                      <pre className="text-muted-foreground">
                        {JSON.stringify(log.old_value, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">New Value:</p>
                      <pre className="text-muted-foreground">
                        {JSON.stringify(log.new_value, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
