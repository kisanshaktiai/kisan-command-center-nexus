import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EnhancedFeatureService } from '@/services/EnhancedFeatureService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Trash2, Plus, Building2, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';

export function OverridesTab() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOverride, setNewOverride] = useState({
    tenant_id: '',
    flag_id: '',
    enabled: true,
    reason: '',
    expires_at: ''
  });

  const { data: overrides, isLoading } = useQuery({
    queryKey: ['tenant-overrides'],
    queryFn: () => EnhancedFeatureService.getTenantOverrides()
  });

  const { data: tenants } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('id, name').order('name');
      return data || [];
    }
  });

  const { data: flags } = useQuery({
    queryKey: ['flags-list'],
    queryFn: async () => {
      const { data } = await supabase.from('feature_flags').select('id, flag_name').order('flag_name');
      return data || [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (overrideId: string) => EnhancedFeatureService.deleteTenantOverride(overrideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-overrides'] });
      toast.success('Override deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete override');
    }
  });

  const createMutation = useMutation({
    mutationFn: () => EnhancedFeatureService.createTenantOverride(
      newOverride.tenant_id,
      newOverride.flag_id,
      newOverride.enabled,
      newOverride.reason,
      newOverride.expires_at || undefined
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-overrides'] });
      toast.success('Override created successfully');
      setIsCreateOpen(false);
      setNewOverride({ tenant_id: '', flag_id: '', enabled: true, reason: '', expires_at: '' });
    },
    onError: () => {
      toast.error('Failed to create override');
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading overrides...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Tenant-Specific Overrides</h3>
          <p className="text-sm text-muted-foreground">
            Override feature flags for specific tenants
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Override
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Tenant Override</DialogTitle>
              <DialogDescription>
                Override a feature flag for a specific tenant
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tenant</Label>
                <select
                  className="w-full p-2 border rounded-md bg-background"
                  value={newOverride.tenant_id}
                  onChange={(e) => setNewOverride({ ...newOverride, tenant_id: e.target.value })}
                >
                  <option value="">Select tenant...</option>
                  {tenants?.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Feature Flag</Label>
                <select
                  className="w-full p-2 border rounded-md bg-background"
                  value={newOverride.flag_id}
                  onChange={(e) => setNewOverride({ ...newOverride, flag_id: e.target.value })}
                >
                  <option value="">Select flag...</option>
                  {flags?.map((flag) => (
                    <option key={flag.id} value={flag.id}>{flag.flag_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Enable Feature</Label>
                <Switch
                  checked={newOverride.enabled}
                  onCheckedChange={(checked) => setNewOverride({ ...newOverride, enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  placeholder="Why is this override needed?"
                  value={newOverride.reason}
                  onChange={(e) => setNewOverride({ ...newOverride, reason: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Expiration Date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={newOverride.expires_at}
                  onChange={(e) => setNewOverride({ ...newOverride, expires_at: e.target.value })}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={() => createMutation.mutate()}
                disabled={!newOverride.tenant_id || !newOverride.flag_id || createMutation.isPending}
              >
                Create Override
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!overrides || overrides.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No tenant overrides configured</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {overrides.map((override) => (
            <Card key={override.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{override.tenants?.name || 'Unknown Tenant'}</span>
                    <Badge variant={override.override_enabled ? 'default' : 'secondary'}>
                      {override.override_enabled ? 'ENABLED' : 'DISABLED'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    Flag: <span className="font-mono">{override.feature_flags?.flag_name || 'Unknown'}</span>
                  </p>
                  
                  {override.override_reason && (
                    <p className="text-sm text-muted-foreground mb-2">
                      Reason: {override.override_reason}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Created: {format(new Date(override.created_at), 'PP')}</span>
                    {override.expires_at && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Expires: {format(new Date(override.expires_at), 'PP')}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(override.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
