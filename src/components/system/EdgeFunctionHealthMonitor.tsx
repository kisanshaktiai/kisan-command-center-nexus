
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EdgeFunctionStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastChecked: string;
  responseTime?: number;
  error?: string;
}

const EDGE_FUNCTIONS = [
  'convert-lead-to-tenant',
  'assign-admin-role',
  'send-admin-invite',
  'verify-admin-invite',
  'create-super-admin',
];

export const EdgeFunctionHealthMonitor: React.FC = () => {
  const [functionStatuses, setFunctionStatuses] = useState<EdgeFunctionStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkFunctionHealth = async (functionName: string): Promise<EdgeFunctionStatus> => {
    const startTime = Date.now();
    
    try {
      // For functions that don't require authentication, we can ping them
      // For others, we'll need to check their deployment status
      let testPayload: any = {};
      
      switch (functionName) {
        case 'convert-lead-to-tenant':
          testPayload = { 
            leadId: 'health-check',
            tenantName: 'health-check', 
            tenantSlug: 'health-check' 
          };
          break;
        case 'assign-admin-role':
          testPayload = { userId: 'health-check', role: 'admin' };
          break;
        case 'send-admin-invite':
          testPayload = { email: 'health@check.com', role: 'admin' };
          break;
        case 'verify-admin-invite':
          testPayload = { token: 'health-check' };
          break;
        case 'create-super-admin':
          testPayload = { email: 'health@check.com', password: 'health-check' };
          break;
      }

      const { error } = await supabase.functions.invoke(functionName, {
        body: testPayload,
      });

      const responseTime = Date.now() - startTime;

      // For health checks, we expect certain types of errors (like validation errors)
      // These indicate the function is running but rejecting our test data
      if (error) {
        const isExpectedHealthCheckError = 
          error.message?.includes('health-check') ||
          error.message?.includes('validation') ||
          error.message?.includes('invalid') ||
          error.message?.includes('required');

        if (isExpectedHealthCheckError) {
          return {
            name: functionName,
            status: 'healthy',
            lastChecked: new Date().toISOString(),
            responseTime,
          };
        } else {
          return {
            name: functionName,
            status: 'unhealthy',
            lastChecked: new Date().toISOString(),
            responseTime,
            error: error.message || 'Unknown error',
          };
        }
      }

      return {
        name: functionName,
        status: 'healthy',
        lastChecked: new Date().toISOString(),
        responseTime,
      };

    } catch (error) {
      return {
        name: functionName,
        status: 'unhealthy',
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  };

  const checkAllFunctions = async () => {
    setIsChecking(true);
    
    try {
      const statusPromises = EDGE_FUNCTIONS.map(functionName => 
        checkFunctionHealth(functionName)
      );
      
      const statuses = await Promise.all(statusPromises);
      setFunctionStatuses(statuses);
    } catch (error) {
      console.error('Failed to check function health:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkAllFunctions();
  }, []);

  const getStatusIcon = (status: EdgeFunctionStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: EdgeFunctionStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const healthyCount = functionStatuses.filter(f => f.status === 'healthy').length;
  const totalCount = functionStatuses.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Edge Function Health</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkAllFunctions}
          disabled={isChecking}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Overall Health: {healthyCount}/{totalCount} functions healthy
            </span>
            <div className="flex items-center space-x-2">
              {healthyCount === totalCount ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            {functionStatuses.map((func) => (
              <div 
                key={func.name} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(func.status)}
                  <div>
                    <div className="font-medium text-sm">{func.name}</div>
                    <div className="text-xs text-gray-500">
                      Last checked: {new Date(func.lastChecked).toLocaleTimeString()}
                      {func.responseTime && (
                        <span className="ml-2">({func.responseTime}ms)</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(func.status)}
                </div>
              </div>
            ))}
          </div>

          {functionStatuses.some(f => f.error) && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
              <div className="space-y-1">
                {functionStatuses
                  .filter(f => f.error)
                  .map((func) => (
                    <div key={func.name} className="text-xs text-red-700">
                      <span className="font-medium">{func.name}:</span> {func.error}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
