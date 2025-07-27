
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Upload, Download, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BulkUserData {
  email: string;
  full_name: string;
  role: string;
  password?: string;
}

export const BulkAdminOperations: React.FC = () => {
  const [bulkData, setBulkData] = useState('');
  const [bulkAction, setBulkAction] = useState<'create' | 'update_roles' | 'activate' | 'deactivate'>('create');
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0,
    failed: 0,
    errors: []
  });

  const queryClient = useQueryClient();

  const bulkOperationMutation = useMutation({
    mutationFn: async ({ action, data }: { action: string; data: BulkUserData[] }) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      setIsProcessing(true);
      setProgress(0);

      for (let i = 0; i < data.length; i++) {
        const user = data[i];
        
        try {
          switch (action) {
            case 'create':
              const { error: createError } = await supabase.functions.invoke('create-super-admin', {
                body: {
                  email: user.email,
                  password: user.password || `temp_${Math.random().toString(36).slice(2)}`,
                  fullName: user.full_name,
                  role: user.role
                }
              });
              
              if (createError) throw createError;
              results.success++;
              break;

            case 'update_roles':
              const { error: updateError } = await supabase
                .from('admin_users')
                .update({ role: user.role })
                .eq('email', user.email);
              
              if (updateError) throw updateError;
              results.success++;
              break;

            case 'activate':
              const { error: activateError } = await supabase
                .from('admin_users')
                .update({ is_active: true })
                .eq('email', user.email);
              
              if (activateError) throw activateError;
              results.success++;
              break;

            case 'deactivate':
              const { error: deactivateError } = await supabase
                .from('admin_users')
                .update({ is_active: false })
                .eq('email', user.email);
              
              if (deactivateError) throw deactivateError;
              results.success++;
              break;
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        setProgress(Math.round(((i + 1) / data.length) * 100));
      }

      setIsProcessing(false);
      return results;
    },
    onSuccess: (results) => {
      setResults(results);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(`Bulk operation completed: ${results.success} success, ${results.failed} failed`);
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast.error(`Bulk operation failed: ${error.message}`);
    }
  });

  const handleBulkOperation = () => {
    if (!bulkData.trim()) {
      toast.error('Please enter bulk data');
      return;
    }

    try {
      const lines = bulkData.trim().split('\n');
      const data: BulkUserData[] = lines.map(line => {
        const [email, full_name, role, password] = line.split(',').map(s => s.trim());
        return { email, full_name, role, password };
      });

      // Validate data
      const invalidEntries = data.filter(entry => !entry.email || !entry.full_name || !entry.role);
      if (invalidEntries.length > 0) {
        toast.error(`Invalid entries found. Please check the format.`);
        return;
      }

      bulkOperationMutation.mutate({ action: bulkAction, data });
    } catch (error) {
      toast.error('Invalid data format. Please check your input.');
    }
  };

  const downloadTemplate = () => {
    const template = 'email,full_name,role,password\nadmin@example.com,John Doe,admin,password123\nmanager@example.com,Jane Smith,platform_admin,password456';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'admin_users_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Bulk Admin Operations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="bulk-action">Operation Type</Label>
            <Select value={bulkAction} onValueChange={(value: any) => setBulkAction(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select operation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create">Create Users</SelectItem>
                <SelectItem value="update_roles">Update Roles</SelectItem>
                <SelectItem value="activate">Activate Users</SelectItem>
                <SelectItem value="deactivate">Deactivate Users</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="bulk-data">Bulk Data (CSV Format)</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>
            <Textarea
              id="bulk-data"
              placeholder="email,full_name,role,password&#10;admin@example.com,John Doe,admin,password123&#10;manager@example.com,Jane Smith,platform_admin,password456"
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              className="min-h-32"
            />
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4" />
              <span className="font-medium">Format Instructions:</span>
            </div>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Use CSV format: email,full_name,role,password</li>
              <li>• One user per line</li>
              <li>• Available roles: admin, platform_admin, super_admin</li>
              <li>• Password is optional for role updates</li>
            </ul>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing...</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {results.success > 0 || results.failed > 0 ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Success: {results.success}
                </Badge>
                <Badge variant="destructive">
                  Failed: {results.failed}
                </Badge>
              </div>

              {results.errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-destructive">Errors:</span>
                  </div>
                  <ul className="text-sm space-y-1 text-destructive">
                    {results.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          <Button
            onClick={handleBulkOperation}
            disabled={bulkOperationMutation.isPending || isProcessing}
            className="w-full"
          >
            {bulkOperationMutation.isPending || isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Execute Bulk Operation
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
