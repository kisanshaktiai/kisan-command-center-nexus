
import React, { useState } from 'react';
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
import { Flag, Plus, Edit, Trash2, Users, Percent } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const FeatureFlags = () => {
  const [newFlagOpen, setNewFlagOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch feature flags from database
  const { data: featureFlags, isLoading } = useQuery({
    queryKey: ['super-admin-feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching feature flags:', error);
        throw error;
      }

      return data || [];
    },
  });

  // Toggle feature flag mutation
  const toggleFlagMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { data, error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error toggling feature flag:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-feature-flags'] });
      toast.success('Feature flag updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update feature flag: ' + error.message);
    },
  });

  // Create feature flag mutation
  const createFlagMutation = useMutation({
    mutationFn: async (flagData: any) => {
      const { data, error } = await supabase
        .from('feature_flags')
        .insert({
          flag_name: flagData.flag_name,
          description: flagData.description,
          is_enabled: flagData.is_enabled || false,
          rollout_percentage: flagData.rollout_percentage || 0,
          target_tenants: flagData.target_tenants || [],
          conditions: flagData.conditions || {},
          metadata: flagData.metadata || {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating feature flag:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-feature-flags'] });
      setNewFlagOpen(false);
      toast.success('Feature flag created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create feature flag: ' + error.message);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground">
            Control feature rollouts and A/B testing across the platform
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flags</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{featureFlags?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Flags</CardTitle>
            <Flag className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {featureFlags?.filter(f => f.is_enabled).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A/B Tests</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {featureFlags?.filter(f => f.rollout_percentage > 0 && f.rollout_percentage < 100).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Targeted</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {featureFlags?.filter(f => f.target_tenants && f.target_tenants.length > 0).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Flags Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>
            Manage feature rollouts and experimentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading feature flags...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flag Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rollout</TableHead>
                  <TableHead>Targeting</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureFlags?.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell>
                      <div className="font-medium">{flag.flag_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">{flag.description}</div>
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
                          <Badge variant="outline">A/B Test</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {flag.target_tenants && flag.target_tenants.length > 0 ? (
                        <Badge variant="outline">
                          {flag.target_tenants.length} tenants
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">All tenants</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(flag.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
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
    </div>
  );
};

const FeatureFlagForm = ({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) => {
  const [formData, setFormData] = useState({
    flag_name: '',
    description: '',
    is_enabled: false,
    rollout_percentage: [0],
    target_tenants: []
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
          placeholder="new_feature_enabled"
          required
        />
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
          Controls what percentage of users see this feature
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Feature Flag'}
      </Button>
    </form>
  );
};

export default FeatureFlags;
