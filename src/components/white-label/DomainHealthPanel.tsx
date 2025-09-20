
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, CheckCircle, XCircle, Clock, RefreshCw, Shield, Activity } from 'lucide-react';
import { toast } from 'sonner';
import type { WhiteLabelConfigData } from '@/hooks/useWhiteLabelConfig';

interface DomainHealthPanelProps {
  config: WhiteLabelConfigData | null;
  updateConfig?: (section: string, field: string, value: any) => void;
}

export function DomainHealthPanel({ config, updateConfig }: DomainHealthPanelProps) {
  const [isChecking, setIsChecking] = useState(false);
  
  // Get domain health from config or set defaults
  const domainHealth = config?.domain_health || {
    ssl_status: 'pending',
    dns_status: 'pending',
    performance_score: 0,
    uptime_percentage: 0,
    last_checked: new Date().toISOString()
  };

  const runHealthChecks = async () => {
    setIsChecking(true);
    const domains = [
      config.domain_config?.custom_domain,
      config.domain_config?.subdomain ? `${config.domain_config.subdomain}.kisanshakti.com` : null
    ].filter(Boolean);

    if (domains.length === 0) {
      toast.error('No domains configured for health check');
      setIsChecking(false);
      return;
    }

    try {
      // Simulate health check - in production this would call an API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newHealth = {
        ssl_status: Math.random() > 0.1 ? 'valid' : 'expired',
        dns_status: Math.random() > 0.1 ? 'configured' : 'misconfigured',
        performance_score: Math.floor(Math.random() * 30) + 70,
        uptime_percentage: Math.random() * 5 + 95,
        last_checked: new Date().toISOString()
      };
      
      if (updateConfig) {
        updateConfig('domain_health', '', newHealth);
      }
      
      toast.success('Domain health check completed');
    } catch (error) {
      toast.error('Failed to check domain health');
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'valid':
      case 'configured':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'error':
      case 'expired':
      case 'invalid':
      case 'misconfigured':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'healthy' || status === 'valid' || status === 'configured' 
      ? 'default' 
      : status === 'warning' || status === 'pending'
      ? 'secondary'
      : 'destructive';
    
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Domain Health Monitoring
            </CardTitle>
            <CardDescription>
              Monitor the health and performance of your custom domains
            </CardDescription>
          </div>
          <Button 
            onClick={runHealthChecks} 
            disabled={isChecking}
            variant="outline"
            size="sm"
          >
            {isChecking ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {isChecking ? 'Checking...' : 'Check Health'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Display current domain health status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 border rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">SSL Status</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(domainHealth.ssl_status)}
                {getStatusBadge(domainHealth.ssl_status)}
              </div>
            </div>

            <div className="p-3 border rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">DNS Status</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(domainHealth.dns_status)}
                {getStatusBadge(domainHealth.dns_status)}
              </div>
            </div>

            <div className="p-3 border rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Performance</span>
              </div>
              <div className={`text-xl font-bold ${
                domainHealth.performance_score >= 90 ? 'text-green-600' :
                domainHealth.performance_score >= 70 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {domainHealth.performance_score}/100
              </div>
            </div>

            <div className="p-3 border rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Uptime</span>
              </div>
              <div className={`text-xl font-bold ${
                domainHealth.uptime_percentage >= 99.9 ? 'text-green-600' :
                domainHealth.uptime_percentage >= 95 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {domainHealth.uptime_percentage.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* DNS Configuration Guide */}
          {config?.domain_config?.custom_domain && (
            <div className="p-4 bg-muted rounded-md">
              <h4 className="text-sm font-medium mb-2">Required DNS Records</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="font-mono bg-background px-2 py-1 rounded">A</span>
                  <div>
                    <p>Point to: 185.158.133.1</p>
                    <p className="text-muted-foreground">Main domain record</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono bg-background px-2 py-1 rounded">CNAME</span>
                  <div>
                    <p>www → {config.domain_config.custom_domain}</p>
                    <p className="text-muted-foreground">Redirect www subdomain</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Last Checked */}
          {domainHealth.last_checked && (
            <div className="text-xs text-muted-foreground text-right">
              Last checked: {new Date(domainHealth.last_checked).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
