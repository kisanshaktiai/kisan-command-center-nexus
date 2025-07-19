
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CheckCircle, Plus, Edit, Trash2, DollarSign, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Updated interface to match the actual Supabase schema
interface BillingPlan {
  id: string;
  name: string;
  description: string | null;
  plan_type: 'kisan' | 'shakti' | 'ai';
  base_price: number;
  currency: string;
  billing_interval: string;
  features: any;
  usage_limits: any;
  limits: any;
  is_active: boolean;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
  tenant_id: string | null;
  // Additional fields that might exist
  trial_days?: number;
  is_public?: boolean;
  price_monthly?: number;
  price_quarterly?: number;
  price_annually?: number;
}

export function BillingPlansManager() {
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch billing plans with proper type handling
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('billing_plans')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Transform data to match our interface
        return (data || []).map(plan => ({
          ...plan,
          plan_type: plan.plan_type as 'kisan' | 'shakti' | 'ai',
          usage_limits: plan.limits || plan.usage_limits || {},
          trial_days: 14, // Default value
          is_public: true, // Default value
        })) as BillingPlan[];
      } catch (error) {
        console.error('Error fetching billing plans:', error);
        return [];
      }
    }
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (planData: Omit<BillingPlan, 'id' | 'created_at' | 'updated_at'>) => {
      try {
        const { data, error } = await supabase
          .from('billing_plans')
          .insert([{
            name: planData.name,
            description: planData.description,
            plan_type: planData.plan_type,
            base_price: planData.base_price,
            currency: planData.currency,
            billing_interval: planData.billing_interval,
            features: planData.features,
            limits: planData.usage_limits,
            is_active: planData.is_active,
            is_custom: planData.is_custom,
            tenant_id: planData.tenant_id
          }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error creating plan:', error);
        throw error;
      }
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
      try {
        const { data, error } = await supabase
          .from('billing_plans')
          .update({
            name: planData.name,
            description: planData.description,
            plan_type: planData.plan_type,
            base_price: planData.base_price,
            currency: planData.currency,
            billing_interval: planData.billing_interval,
            features: planData.features,
            limits: planData.usage_limits,
            is_active: planData.is_active,
            is_custom: planData.is_custom
          })
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error updating plan:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plans'] });
      toast.success('Plan updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update plan: ' + error.message);
    }
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      try {
        const { error } = await supabase
          .from('billing_plans')
          .delete()
          .eq('id', planId);
        
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting plan:', error);
        throw error;
      }
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
      case 'kisan': return 'bg-blue-500';
      case 'shakti': return 'bg-purple-500';
      case 'ai': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPlanDisplayName = (type: string) => {
    switch (type) {
      case 'kisan': return 'Kisan (Basic)';
      case 'shakti': return 'Shakti (Growth)';
      case 'ai': return 'AI (Enterprise)';
      default: return type;
    }
  };

  const formatPrice = (price: number, currency: string = 'INR') => {
    return `${currency === 'INR' ? '₹' : '$'}${price.toLocaleString()}`;
  };

  const getFeaturesList = (features: any) => {
    if (!features) return [];
    
    if (Array.isArray(features)) return features;
    
    // If it's a JSON string, try to parse it
    if (typeof features === 'string') {
      try {
        const parsed = JSON.parse(features);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    
    // Convert object to array of feature names
    if (typeof features === 'object') {
      return Object.keys(features).filter(key => features[key] === true);
    }
    
    return [];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing Plans Management</h1>
          <p className="text-muted-foreground">Manage the 3-tier subscription plans: Kisan, Shakti, and AI</p>
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
              <DialogDescription>Configure a new billing plan for tenants</DialogDescription>
            </DialogHeader>
            <CreatePlanForm onSubmit={createPlanMutation.mutate} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          {plansLoading ? (
            <div className="text-center py-8">Loading plans...</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.id} className="relative">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {getPlanDisplayName(plan.plan_type)}
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
                          onClick={() => setSelectedPlan(plan)}
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
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Price</span>
                        <span className="font-medium">{formatPrice(plan.base_price, plan.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Billing</span>
                        <span className="font-medium">{plan.billing_interval}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Features</h4>
                      <div className="space-y-1">
                        {getFeaturesList(plan.features).slice(0, 3).map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {typeof feature === 'string' ? feature : String(feature)}
                          </div>
                        ))}
                        {getFeaturesList(plan.features).length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{getFeaturesList(plan.features).length - 3} more features
                          </div>
                        )}
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
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{plans.length}</div>
                <p className="text-xs text-muted-foreground">Active billing plans</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{plans.filter(p => p.is_active).length}</div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Price</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{plans.length > 0 ? Math.round(plans.reduce((sum, p) => sum + p.base_price, 0) / plans.length) : 0}
                </div>
                <p className="text-xs text-muted-foreground">Average plan price</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Create Plan Form Component
function CreatePlanForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    plan_type: 'kisan' as 'kisan' | 'shakti' | 'ai',
    base_price: 0,
    currency: 'INR',
    billing_interval: 'monthly',
    features: '[]',
    usage_limits: '{}',
    is_active: true,
    is_custom: false,
    tenant_id: null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const planData = {
        ...formData,
        base_price: Number(formData.base_price),
        features: formData.features ? JSON.parse(formData.features) : [],
        usage_limits: formData.usage_limits ? JSON.parse(formData.usage_limits) : {}
      };
      
      onSubmit(planData);
    } catch (error) {
      toast.error('Invalid JSON in features or usage limits');
    }
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
            placeholder="e.g., Kisan (Basic)"
            required
          />
        </div>
        <div>
          <Label htmlFor="plan_type">Plan Type</Label>
          <Select 
            value={formData.plan_type} 
            onValueChange={(value) => setFormData({ ...formData, plan_type: value as 'kisan' | 'shakti' | 'ai' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kisan">Kisan (Basic)</SelectItem>
              <SelectItem value="shakti">Shakti (Growth)</SelectItem>
              <SelectItem value="ai">AI (Enterprise)</SelectItem>
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
          placeholder="Plan description..."
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
            onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
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
            onValueChange={(value) => setFormData({ ...formData, billing_interval: value })}
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
        <Label htmlFor="features">Features (JSON Array)</Label>
        <Textarea
          id="features"
          value={formData.features}
          onChange={(e) => setFormData({ ...formData, features: e.target.value })}
          placeholder='["AI Chat (100 queries)", "Weather forecast", "Basic support"]'
        />
      </div>
      
      <div>
        <Label htmlFor="usage_limits">Usage Limits (JSON)</Label>
        <Textarea
          id="usage_limits"
          value={formData.usage_limits}
          onChange={(e) => setFormData({ ...formData, usage_limits: e.target.value })}
          placeholder='{"max_lands": 3, "ai_queries": 100, "soil_reports": 2}'
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
            id="is_custom"
            checked={formData.is_custom}
            onCheckedChange={(checked) => setFormData({ ...formData, is_custom: checked })}
          />
          <Label htmlFor="is_custom">Custom</Label>
        </div>
      </div>
      
      <Button type="submit" className="w-full">Create Plan</Button>
    </form>
  );
}
