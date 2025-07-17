
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, CheckCircle, XCircle, Clock, RefreshCw, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface DomainHealthPanelProps {
  config: any;
}

interface DomainHealth {
  domain: string;
  status: 'healthy' | 'warning' | 'error';
  ssl_status: 'valid' | 'expired' | 'invalid' | 'none';
  dns_status: 'configured' | 'misconfigured' | 'pending';
  last_checked: string;
  response_time: number;
  issues: string[];
}

export function DomainHealthPanel({ config }: DomainHealthPanelProps) {
  const [healthData, setHealthData] = useState<DomainHealth[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkDomainHealth = async (domain: string): Promise<DomainHealth> => {
    // Simulate domain health check
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const mockHealth: DomainHealth = {
      domain,
      status: Math.random() > 0.8 ? 'error' : Math.random() > 0.6 ? 'warning' : 'healthy',
      ssl_status: Math.random() > 0.9 ? 'expired' : Math.random() > 0.95 ? 'invalid' : 'valid',
      dns_status: Math.random() > 0.9 ? 'misconfigured' : 'configured',
      last_checked: new Date().toISOString(),
      response_time: 150 + Math.random() * 300,
      issues: []
    };

    if (mockHealth.status === 'error') {
      mockHealth.issues.push('Domain not responding');
    }
    if (mockHealth.ssl_status === 'expired') {
      mockHealth.issues.push('SSL certificate expired');
    }
    if (mockHealth.dns_status === 'misconfigured') {
      mockHealth.issues.push('DNS records misconfigured');
    }

    return mockHealth;
  };

  const runHealthChecks = async () => {
    setIsChecking(true);
    const domains = [
      config.domain_config?.custom_domain,
      config.domain_config?.subdomain ? `${config.domain_config.subdomain}.yourdomain.com` : null
    ].filter(Boolean);

    if (domains.length === 0) {
      toast.error('No domains configured for health check');
      setIsChecking(false);
      return;
    }

    try {
      const healthResults = await Promise.all(
        domains.map(domain => checkDomainHealth(domain))
      );
      setHealthData(healthResults);
      toast.success('Domain health check completed');
    } catch (error) {
      toast.error('Failed to check domain health');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (config.domain_config?.custom_domain || config.domain_config?.subdomain) {
      runHealthChecks();
    }
  }, [config.domain_config?.custom_domain, config.domain_config?.subdomain]);

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
        {healthData.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            {config.domain_config?.custom_domain || config.domain_config?.subdomain 
              ? 'No health data available. Click "Check Health" to run diagnostics.'
              : 'Configure custom domains to enable health monitoring.'
            }
          </div>
        ) : (
          <div className="space-y-4">
            {healthData.map((health) => (
              <div key={health.domain} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(health.status)}
                    <span className="font-medium">{health.domain}</span>
                  </div>
                  {getStatusBadge(health.status)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Shield className="w-3 h-3" />
                      <span className="text-gray-600">SSL Status</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(health.ssl_status)}
                      {getStatusBadge(health.ssl_status)}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Globe className="w-3 h-3" />
                      <span className="text-gray-600">DNS Status</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(health.dns_status)}
                      {getStatusBadge(health.dns_status)}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-600 mb-1">Response Time</div>
                    <div className="font-medium">{Math.round(health.response_time)}ms</div>
                  </div>

                  <div>
                    <div className="text-gray-600 mb-1">Last Checked</div>
                    <div className="font-medium">
                      {new Date(health.last_checked).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {health.issues.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="text-sm font-medium text-red-800 mb-1">Issues Found:</div>
                    <ul className="text-sm text-red-700 list-disc list-inside">
                      {health.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
