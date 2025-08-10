
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, AlertTriangle, CheckCircle, Database, Users, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PurgeResult {
  success: boolean;
  scope: string;
  truncated_tables: string[];
  total_tables_truncated: number;
  executed_at: string;
  executed_by: string;
}

const DataPurgeManager: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [purgeScope, setPurgeScope] = useState<'all' | 'tenants' | 'leads'>('all');
  const [lastPurgeResult, setLastPurgeResult] = useState<PurgeResult | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handlePurgeData = async () => {
    setIsLoading(true);
    try {
      console.log(`Executing data purge with scope: ${purgeScope}`);
      
      const { data, error } = await supabase.rpc('purge_app_data', {
        p_scope: purgeScope
      });

      if (error) {
        console.error('Purge error:', error);
        throw new Error(error.message);
      }

      if (data) {
        setLastPurgeResult(data as PurgeResult);
        toast.success(`Successfully purged ${data.total_tables_truncated} tables`);
        console.log('Purge completed:', data);
      }
    } catch (error: any) {
      console.error('Failed to purge data:', error);
      toast.error(`Failed to purge data: ${error.message}`);
    } finally {
      setIsLoading(false);
      setIsConfirmOpen(false);
    }
  };

  const getScopeDescription = (scope: string) => {
    switch (scope) {
      case 'all':
        return 'Remove ALL data including tenants, leads, invitations, and registrations';
      case 'tenants':
        return 'Remove tenant data, onboarding workflows, and related records';
      case 'leads':
        return 'Remove leads, activities, communications, and scoring rules';
      default:
        return 'Unknown scope';
    }
  };

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'all':
        return <Database className="h-4 w-4" />;
      case 'tenants':
        return <Users className="h-4 w-4" />;
      case 'leads':
        return <UserCheck className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Purge Manager
          </CardTitle>
          <CardDescription>
            Manage database cleanup operations for performance testing and maintenance.
            <strong className="text-destructive"> Use with extreme caution!</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> These operations permanently delete data and cannot be undone. 
              Make sure you have backups if needed.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Purge Scope</label>
              <Select value={purgeScope} onValueChange={(value: 'all' | 'tenants' | 'leads') => setPurgeScope(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select purge scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Complete Purge (All Data)
                    </div>
                  </SelectItem>
                  <SelectItem value="tenants">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Tenant Data Only
                    </div>
                  </SelectItem>
                  <SelectItem value="leads">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Lead Data Only
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {getScopeDescription(purgeScope)}
              </p>
            </div>

            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Execute Data Purge
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Confirm Data Purge
                  </DialogTitle>
                  <DialogDescription>
                    You are about to permanently delete data with scope: <strong>{purgeScope}</strong>
                    <br /><br />
                    {getScopeDescription(purgeScope)}
                    <br /><br />
                    This action cannot be undone. Are you sure you want to continue?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsConfirmOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handlePurgeData}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Purging...' : 'Confirm Purge'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {lastPurgeResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Last Purge Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Scope</p>
                <Badge variant="outline" className="mt-1">
                  {getScopeIcon(lastPurgeResult.scope)}
                  <span className="ml-1">{lastPurgeResult.scope}</span>
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Tables Truncated</p>
                <p className="text-lg font-bold text-green-600">{lastPurgeResult.total_tables_truncated}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Affected Tables</p>
              <div className="flex flex-wrap gap-1">
                {lastPurgeResult.truncated_tables.map((table, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {table}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">Executed At</p>
              <p className="text-sm text-muted-foreground">
                {new Date(lastPurgeResult.executed_at).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Manual Auth User Cleanup</CardTitle>
          <CardDescription>
            Users in the auth.users table must be deleted manually via the Supabase Dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              After purging application data, remember to manually delete users from the auth.users table 
              in your Supabase Dashboard under Authentication → Users for complete cleanup.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataPurgeManager;
