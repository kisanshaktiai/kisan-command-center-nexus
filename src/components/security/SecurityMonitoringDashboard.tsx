
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  id: string;
  event_type: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  event_details: any;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highRiskEvents: number;
  recentEvents: SecurityEvent[];
  topRiskTypes: { type: string; count: number }[];
}

export const SecurityMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch recent security events with proper column names
      const { data: events, error: eventsError } = await supabase
        .from('security_events')
        .select('id, event_type, risk_level, event_details, created_at, ip_address, user_agent, metadata')
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;

      // Transform the data to match our interface
      const transformedEvents: SecurityEvent[] = (events || []).map(event => ({
        id: event.id,
        event_type: event.event_type,
        risk_level: (event.risk_level as 'low' | 'medium' | 'high' | 'critical') || 'low',
        event_details: event.event_details || event.metadata || {},
        created_at: event.created_at,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        metadata: event.metadata
      }));

      // Calculate metrics
      const totalEvents = transformedEvents.length;
      const criticalEvents = transformedEvents.filter(e => e.risk_level === 'critical').length;
      const highRiskEvents = transformedEvents.filter(e => e.risk_level === 'high').length;
      const recentEvents = transformedEvents.slice(0, 10);

      // Calculate top risk types
      const riskTypes: { [key: string]: number } = {};
      transformedEvents.forEach(event => {
        riskTypes[event.event_type] = (riskTypes[event.event_type] || 0) + 1;
      });
      
      const topRiskTypes = Object.entries(riskTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setMetrics({
        totalEvents,
        criticalEvents,
        highRiskEvents,
        recentEvents,
        topRiskTypes
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch security metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityMetrics();
  }, []);

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading security metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>No security metrics available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Security Monitoring</h2>
        <Button onClick={fetchSecurityMetrics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Last 50 events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.criticalEvents}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Risk Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.highRiskEvents}</div>
            <p className="text-xs text-muted-foreground">Need investigation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.criticalEvents > 0 ? 'HIGH' : metrics.highRiskEvents > 5 ? 'MEDIUM' : 'LOW'}
            </div>
            <p className="text-xs text-muted-foreground">Overall system risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.recentEvents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recent security events</p>
            ) : (
              metrics.recentEvents.map(event => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getRiskBadgeVariant(event.risk_level)}>
                        {event.risk_level.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{event.event_type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                    {event.ip_address && (
                      <p className="text-xs text-muted-foreground">IP: {event.ip_address}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Risk Types */}
      <Card>
        <CardHeader>
          <CardTitle>Top Security Event Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.topRiskTypes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No risk types to display</p>
            ) : (
              metrics.topRiskTypes.map(({ type, count }) => (
                <div key={type} className="flex justify-between items-center p-2 border rounded">
                  <span className="font-medium">{type}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
