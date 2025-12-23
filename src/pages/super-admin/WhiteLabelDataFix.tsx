import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertTriangle, Database } from 'lucide-react';
import { whiteLabelSyncService } from '@/services/WhiteLabelSyncService';
import { toast } from 'sonner';

export default function WhiteLabelDataFix() {
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState<{ fixed: number; errors: string[] } | null>(null);

  const handleFix = async () => {
    setIsFixing(true);
    setResult(null);

    try {
      const fixResult = await whiteLabelSyncService.fixAllTenantsData();
      
      if (fixResult.success && fixResult.data) {
        setResult(fixResult.data);
        toast.success(`Fixed ${fixResult.data.fixed} tenants`);
      } else {
        toast.error('Failed to fix data', {
          description: fixResult.error
        });
      }
    } catch (error) {
      console.error('Error fixing data:', error);
      toast.error('Error fixing data', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            <CardTitle>White-Label Data Sync Tool</CardTitle>
          </div>
          <CardDescription>
            Fix data mismatches between tenants and white_label_configs tables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This tool will:
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Create missing white_label_configs entries for all tenants</li>
                <li>Sync domain and branding data from tenants to white_label_configs</li>
                <li>Make white_label_configs the source of truth going forward</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button 
              onClick={handleFix}
              disabled={isFixing}
              size="lg"
            >
              {isFixing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fixing Data...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Fix All Tenant Data
                </>
              )}
            </Button>
          </div>

          {result && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold">
                    ✅ Successfully processed {result.fixed} tenants
                  </div>
                </AlertDescription>
              </Alert>

              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">
                      ⚠️  Errors encountered for {result.errors.length} tenants:
                    </div>
                    <ul className="list-disc ml-6 space-y-1 text-sm">
                      {result.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Technical Details:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Source of truth: <code>white_label_configs</code> table</li>
              <li>• Sync direction: white_label_configs → tenants</li>
              <li>• Tenant fields synced: subdomain, custom_domain, metadata</li>
              <li>• Safe to run multiple times (idempotent)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
