
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Activity, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SecurityEvent {
  id: string;
  event_type: string;
  event_details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export const SecurityEventMonitor: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [criticalEvents, setCriticalEvents] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    const fetchSecurityEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('security_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching security events:', error);
          return;
        }

        setEvents(data || []);
        setCriticalEvents(data?.filter(event => 
          event.risk_level === 'critical' || event.risk_level === 'high'
        ) || []);
      } catch (error) {
        console.error('Error fetching security events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityEvents();

    // Set up real-time subscription for new security events
    const subscription = supabase
      .channel('security_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_events'
        },
        (payload) => {
          const newEvent = payload.new as SecurityEvent;
          setEvents(prev => [newEvent, ...prev].slice(0, 50));
          
          if (newEvent.risk_level === 'critical' || newEvent.risk_level === 'high') {
            setCriticalEvents(prev => [newEvent, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, isAdmin]);

  if (!user || !isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {criticalEvents.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {criticalEvents.length} high-risk security event(s) detected recently. 
            Immediate attention may be required.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Recent Security Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No security events recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={getRiskBadgeVariant(event.risk_level)}
                        className="flex items-center gap-1"
                      >
                        {getRiskIcon(event.risk_level)}
                        {event.risk_level.toUpperCase()}
                      </Badge>
                      <span className="font-medium">
                        {event.event_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      {event.ip_address && (
                        <div>IP: {event.ip_address}</div>
                      )}
                      {event.event_details && Object.keys(event.event_details).length > 0 && (
                        <div className="bg-muted p-2 rounded text-xs font-mono">
                          {JSON.stringify(event.event_details, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
