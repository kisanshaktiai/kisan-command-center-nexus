import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flag, Plus, Edit, Trash2, BarChart3, History, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { EnhancedFeatureService } from '@/services/EnhancedFeatureService';
import { FeatureFlagStats } from '@/components/super-admin/feature-flags/FeatureFlagStats';
import { AuditLogTab } from '@/components/super-admin/feature-flags/AuditLogTab';
import { OverridesTab } from '@/components/super-admin/feature-flags/OverridesTab';
import { AnalyticsTab } from '@/components/super-admin/feature-flags/AnalyticsTab';
import { format } from 'date-fns';

const FeatureFlags = () => {
  const [newFlagOpen, setNewFlagOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('flags');
  const queryClient = useQueryClient();

  // Fetch feature flags
  const { data: featureFlags, isLoading } = useQuery({
    queryKey: ['feature-flags-enhanced'],
    queryFn: () => EnhancedFeatureService.getAllFlags()
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['feature-flag-stats'],
    queryFn: () => EnhancedFeatureService.getStats()
  });

  // Toggle feature flag mutation
  const toggleFlagMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      EnhancedFeatureService.toggleFlag(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flag-stats'] });
      toast.success('Feature flag updated');
    },
    onError: () => {
      toast.error('Failed to update feature flag');
    },
  });

  // Create feature flag mutation
  const createFlagMutation = useMutation({
    mutationFn: (flagData: any) => EnhancedFeatureService.createFlag(flagData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flag-stats'] });
      setNewFlagOpen(false);
      toast.success('Feature flag created successfully');
    },
    onError: () => {
      toast.error('Failed to create feature flag');
    },
  });

  // Delete feature flag mutation
  const deleteFlagMutation = useMutation({
    mutationFn: (flagId: string) => EnhancedFeatureService.deleteFlag(flagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flag-stats'] });
      toast.success('Feature flag deleted');
    },
    onError: () => {
      toast.error('Failed to delete feature flag');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground">
            World-class feature management with live data and real-time analytics
          </p>
        </div>
        
        <Dialog open={newFlagOpen} onOpenChange={setNewFlagOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Flag
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Feature Flag</DialogTitle>
              <DialogDescription>
                Add a new feature flag for controlled rollouts
              </DialogDescription>
            </DialogHeader>
            <FeatureFlagForm 
              onSubmit={(data) => createFlagMutation.mutate(data)}
              isLoading={createFlagMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Dashboard */}
      {stats && <FeatureFlagStats stats={stats} />}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="flags">
            <Flag className="h-4 w-4 mr-2" />
            Flags
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="overrides">
            <Settings2 className="h-4 w-4 mr-2" />
            Overrides
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-4 w-4 mr-2" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Flags Tab */}
        <TabsContent value="flags">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Manage feature rollouts, experiments, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading feature flags...</div>
              ) : !featureFlags || featureFlags.length === 0 ? (
                <div className="text-center py-12">
                  <Flag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No feature flags yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Create your first feature flag to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Flag Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rollout</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {featureFlags?.map((flag) => (
                      <TableRow key={flag.id}>
                        <TableCell>
                          <div className="font-medium font-mono">{flag.flag_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-muted-foreground">{flag.description || '-'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {flag.flag_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={flag.is_enabled}
                              onCheckedChange={(checked) => 
                                toggleFlagMutation.mutate({ id: flag.id, enabled: checked })
                              }
                              disabled={toggleFlagMutation.isPending}
                            />
                            <Badge variant={flag.is_enabled ? 'default' : 'secondary'}>
                              {flag.is_enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium">{flag.rollout_percentage}%</div>
                            {flag.rollout_percentage > 0 && flag.rollout_percentage < 100 && (
                              <Badge variant="outline" className="text-warning">Gradual</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(flag.created_at), 'PP')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteFlagMutation.mutate(flag.id)}
                              disabled={deleteFlagMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>

        {/* Overrides Tab */}
        <TabsContent value="overrides">
          <OverridesTab />
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <AuditLogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const FeatureFlagForm = ({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) => {
  const [formData, setFormData] = useState({
    flag_name: '',
    description: '',
    is_enabled: false,
    rollout_percentage: [0],
    flag_type: 'release' as 'release' | 'experiment' | 'operational' | 'permission'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      rollout_percentage: formData.rollout_percentage[0]
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="flag_name">Flag Name</Label>
        <Input
          id="flag_name"
          value={formData.flag_name}
          onChange={(e) => setFormData({ ...formData, flag_name: e.target.value })}
          placeholder="ai_chat_enabled"
          required
        />
        <p className="text-xs text-muted-foreground">Use snake_case for flag names</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe what this feature flag controls"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="flag_type">Flag Type</Label>
        <select
          id="flag_type"
          className="w-full p-2 border rounded-md bg-background"
          value={formData.flag_type}
          onChange={(e) => setFormData({ ...formData, flag_type: e.target.value as any })}
        >
          <option value="release">Release (Feature Toggle)</option>
          <option value="experiment">Experiment (A/B Test)</option>
          <option value="operational">Operational (Kill Switch)</option>
          <option value="permission">Permission (Access Control)</option>
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.is_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
          />
          <Label>Enable by default</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Rollout Percentage: {formData.rollout_percentage[0]}%</Label>
        <Slider
          value={formData.rollout_percentage}
          onValueChange={(value) => setFormData({ ...formData, rollout_percentage: value })}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="text-xs text-muted-foreground">
          Controls what percentage of tenants see this feature
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Feature Flag'}
      </Button>
    </form>
  );
};

export default FeatureFlags;
