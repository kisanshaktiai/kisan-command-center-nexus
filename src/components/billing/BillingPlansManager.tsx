
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, CheckCircle, DollarSign } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BillingPlan {
  id: string;
  name: string;
  description: string | null;
  plan_type: string;
  base_price: number;
  currency: string;
  billing_interval: 'monthly' | 'quarterly' | 'annually';
  trial_days: number;
  features: Record<string, any>;
  usage_limits: Record<string, any>;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export function BillingPlansManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
  const queryClient = useQueryClient();

  // Fetch billing plans
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BillingPlan[];
    }
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (planData: Omit<BillingPlan, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('billing_plans')
        .insert([planData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plans'] });
      toast.success('Plan created successfully');
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Failed to create plan: ' + error.message);
    }
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, ...planData }: Partial<BillingPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('billing_plans')
        .update(planData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plans'] });
      toast.success('Plan updated successfully');
      setEditingPlan(null);
    },
    onError: (error: any) => {
      toast.error('Failed to update plan: ' + error.message);
    }
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('billing_plans')
        .delete()
        .eq('id', planId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plans'] });
      toast.success('Plan deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete plan: ' + error.message);
    }
  });

  const getPlanTypeColor = (type: string) => {
    switch (type) {
      case 'starter': return 'bg-blue-500';
      case 'growth': return 'bg-purple-500';
      case 'enterprise': return 'bg-green-500';
      case 'custom': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const formatPrice = (price: number, currency: string, interval: string) => {
    return `${currency === 'INR' ? '₹' : '$'}${price.toLocaleString()}/${interval}`;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading billing plans...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Billing Plans</h2>
          <p className="text-muted-foreground">Manage subscription plans and pricing</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Billing Plan</DialogTitle>
              <DialogDescription>Configure a new subscription plan</DialogDescription>
            </DialogHeader>
            <PlanForm onSubmit={createPlanMutation.mutate} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    <Badge className={getPlanTypeColor(plan.plan_type)}>
                      {plan.plan_type}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPlan(plan)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePlanMutation.mutate(plan.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {formatPrice(plan.base_price, plan.currency, plan.billing_interval)}
                </div>
                {plan.trial_days > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {plan.trial_days} days free trial
                  </p>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Features</h4>
                <div className="space-y-1">
                  {Object.entries(plan.features).slice(0, 4).map(([key, value]) => 
                    value && (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    )
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Usage Limits</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {Object.entries(plan.usage_limits).map(([key, value]) => (
                    <div key={key}>
                      {key.replace(/_/g, ' ')}: {value === -1 ? 'Unlimited' : value}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Status</span>
                <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Billing Plan</DialogTitle>
            <DialogDescription>Update the plan configuration</DialogDescription>
          </DialogHeader>
          {editingPlan && (
            <PlanForm 
              initialData={editingPlan}
              onSubmit={(data) => updatePlanMutation.mutate({ id: editingPlan.id, ...data })}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Plan Form Component
function PlanForm({ 
  initialData, 
  onSubmit 
}: { 
  initialData?: BillingPlan;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    plan_type: initialData?.plan_type || 'starter',
    base_price: initialData?.base_price || 0,
    currency: initialData?.currency || 'INR',
    billing_interval: initialData?.billing_interval || 'monthly',
    trial_days: initialData?.trial_days || 0,
    features: initialData?.features || {},
    usage_limits: initialData?.usage_limits || {},
    is_active: initialData?.is_active ?? true,
    is_public: initialData?.is_public ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Plan Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="plan_type">Plan Type</Label>
          <Select 
            value={formData.plan_type} 
            onValueChange={(value) => setFormData({ ...formData, plan_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="base_price">Base Price</Label>
          <Input
            id="base_price"
            type="number"
            step="0.01"
            value={formData.base_price}
            onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select 
            value={formData.currency} 
            onValueChange={(value) => setFormData({ ...formData, currency: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">INR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="billing_interval">Billing Interval</Label>
          <Select 
            value={formData.billing_interval} 
            onValueChange={(value: any) => setFormData({ ...formData, billing_interval: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="trial_days">Trial Days</Label>
        <Input
          id="trial_days"
          type="number"
          value={formData.trial_days}
          onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) })}
        />
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="is_public"
            checked={formData.is_public}
            onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
          />
          <Label htmlFor="is_public">Public</Label>
        </div>
      </div>
      
      <Button type="submit" className="w-full">
        {initialData ? 'Update Plan' : 'Create Plan'}
      </Button>
    </form>
  );
}
