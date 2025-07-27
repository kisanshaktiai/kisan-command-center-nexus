
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User, Shield, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';

interface AuditLog {
  id: string;
  admin_id: string;
  target_admin_id: string;
  action: string;
  details: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export const AdminAuditLog: React.FC = () => {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as AuditLog[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'admin_user_created': return <User className="h-4 w-4 text-green-600" />;
      case 'admin_user_updated': return <Shield className="h-4 w-4 text-blue-600" />;
      case 'admin_user_deleted': return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'admin_login_success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'admin_access_denied': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'admin_user_created': return <Badge variant="default" className="bg-green-100 text-green-800">Created</Badge>;
      case 'admin_user_updated': return <Badge variant="default" className="bg-blue-100 text-blue-800">Updated</Badge>;
      case 'admin_user_deleted': return <Badge variant="destructive">Deleted</Badge>;
      case 'admin_login_success': return <Badge variant="default" className="bg-green-100 text-green-800">Login</Badge>;
      case 'admin_access_denied': return <Badge variant="destructive">Access Denied</Badge>;
      default: return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionDescription = (log: AuditLog) => {
    const details = log.details || {};
    
    switch (log.action) {
      case 'admin_user_created':
        return `Created admin user: ${details.email} (${details.role})`;
      case 'admin_user_updated':
        return `Updated admin user: ${details.new_values?.email || 'Unknown'}`;
      case 'admin_user_deleted':
        return `Deleted admin user: ${details.email} (${details.role})`;
      case 'admin_login_success':
        return `Successful admin login (${details.role})`;
      case 'admin_access_denied':
        return `Access denied: ${details.error}`;
      default:
        return log.action;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      {getActionBadge(log.action)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {getActionDescription(log)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {formatTimestamp(log.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {log.ip_address || 'N/A'}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
