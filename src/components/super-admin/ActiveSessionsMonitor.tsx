
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Globe, Clock } from 'lucide-react';

interface Session {
  id: string;
  user_id: string;
  tenant_id: string;
  last_active_at: string;
}

interface ActiveSessionsMonitorProps {
  sessions: Session[];
}

export const ActiveSessionsMonitor: React.FC<ActiveSessionsMonitorProps> = ({ sessions = [] }) => {
  // Group sessions by tenant
  const sessionsByTenant = React.useMemo(() => {
    if (!Array.isArray(sessions)) return [];
    
    const grouped = sessions.reduce((acc, session) => {
      const tenantId = session.tenant_id || 'unknown';
      if (!acc[tenantId]) {
        acc[tenantId] = [];
      }
      acc[tenantId].push(session);
      return acc;
    }, {} as Record<string, Session[]>);

    return Object.entries(grouped).map(([tenantId, sessions]) => ({
      tenantId,
      sessionCount: sessions.length,
      sessions
    }));
  }, [sessions]);

  const formatLastActive = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
          <Users className="h-5 w-5 text-blue-500" />
          Active Sessions ({sessions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {sessionsByTenant.map(({ tenantId, sessionCount, sessions: tenantSessions }) => (
            <div key={tenantId} className="border border-slate-200 rounded-lg p-4 bg-white/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-600" />
                  <span className="font-medium text-slate-800">
                    Tenant: {tenantId.slice(0, 8)}...
                  </span>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {sessionCount} active
                </Badge>
              </div>
              
              <div className="space-y-2">
                {tenantSessions.slice(0, 3).map((session) => (
                  <div key={session.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-slate-600">
                        User: {session.user_id?.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Clock className="h-3 w-3" />
                      {formatLastActive(session.last_active_at)}
                    </div>
                  </div>
                ))}
                
                {tenantSessions.length > 3 && (
                  <div className="text-xs text-slate-500 text-center pt-2">
                    +{tenantSessions.length - 3} more sessions
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {sessionsByTenant.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No active sessions</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
