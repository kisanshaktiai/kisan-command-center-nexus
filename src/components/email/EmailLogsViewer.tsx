
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Mail, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useEmailService } from '@/hooks/useEmailService';
import type { EmailLog } from '@/types/email';
import { format } from 'date-fns';

interface EmailLogsViewerProps {
  tenantId?: string;
  limit?: number;
}

export const EmailLogsViewer: React.FC<EmailLogsViewerProps> = ({ 
  tenantId, 
  limit = 50 
}) => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const { loading, error, getEmailLogs } = useEmailService();

  const loadLogs = async () => {
    const fetchedLogs = await getEmailLogs(tenantId, limit);
    setLogs(fetchedLogs);
  };

  useEffect(() => {
    loadLogs();
  }, [tenantId, limit]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
      case 'bounced':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
      case 'bounced':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Logs
            </CardTitle>
            <CardDescription>
              Track all email delivery statuses and history
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md mb-4">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No email logs found
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <p className="font-medium">{log.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        To: {log.recipient_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(log.status)}>
                      {log.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Type:</span> {log.template_type}
                  {log.retry_count > 0 && (
                    <span className="ml-4">
                      <span className="font-medium">Retries:</span> {log.retry_count}
                    </span>
                  )}
                </div>

                {log.error_message && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    <span className="font-medium">Error:</span> {log.error_message}
                  </div>
                )}

                {(log.sent_at || log.delivered_at || log.opened_at) && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    {log.sent_at && (
                      <div>
                        <span className="font-medium">Sent:</span> {format(new Date(log.sent_at), 'MMM dd, HH:mm')}
                      </div>
                    )}
                    {log.delivered_at && (
                      <div>
                        <span className="font-medium">Delivered:</span> {format(new Date(log.delivered_at), 'MMM dd, HH:mm')}
                      </div>
                    )}
                    {log.opened_at && (
                      <div>
                        <span className="font-medium">Opened:</span> {format(new Date(log.opened_at), 'MMM dd, HH:mm')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
