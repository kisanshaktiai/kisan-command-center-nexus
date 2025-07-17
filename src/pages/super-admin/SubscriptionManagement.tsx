
import React, { useState } from 'react';
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
import { toast } from 'sonner';

interface BillingPlan {
  id: string;
  name: string;
  description: string | null;
  plan_type: 'starter' | 'growth' | 'enterprise' | 'custom';
  base_price: number;
  currency: string;
  billing_interval: 'monthly' | 'quarterly' | 'annually';
  features: string[];
  usage_limits: Record<string, any>;
  is_active: boolean;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantSubscription {
  id: string;
  tenant_id: string;
  billing_plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_start: string | null;
  trial_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  billing_plans?: {
    name: string;
    plan_type: string;
  };
  tenants?: {
    name: string;
  };
}

// Mock data until Supabase types are regenerated
const mockPlans: BillingPlan[] = [
  {
    id: '1',
    name: 'Starter',
    description: 'Perfect for small farms getting started',
    plan_type: 'starter',
    base_price: 29.99,
    currency: 'USD',
    billing_interval: 'monthly',
    features: ['Basic AI recommendations', 'Weather alerts', 'Up to 5 land plots'],
    usage_limits: { land_plots: 5, api_calls: 1000 },
    is_active: true,
    is_custom: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Growth',
    description: 'Ideal for growing agricultural businesses',
    plan_type: 'growth',
    base_price: 79.99,
    currency: 'USD',
    billing_interval: 'monthly',
    features: ['Advanced AI insights', 'Market price alerts', 'Up to 25 land plots', 'Analytics dashboard'],
    usage_limits: { land_plots: 25, api_calls: 5000 },
    is_active: true,
    is_custom: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const mockSubscriptions: TenantSubscription[] = [
  {
    id: '1',
    tenant_id: '1',
    billing_plan_id: '1',
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    trial_start: null,
    trial_end: null,
    cancelled_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    billing_plans: {
      name: 'Starter',
      plan_type: 'starter'
    },
    tenants: { name: 'Demo Farm Co.' }
  }
];

export default function SubscriptionManagement() {
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Use mock data until Supabase types are regenerated
  const plans = mockPlans;
  const subscriptions = mockSubscriptions;
  const plansLoading = false;
  const subscriptionsLoading = false;

  const createPlan = async (planData: any) => {
    toast.success('Plan created successfully (demo mode)');
    setIsCreateDialogOpen(false);
  };

  const updatePlan = async (planData: any) => {
    toast.success('Plan updated successfully (demo mode)');
  };

  const deletePlan = async (planId: string) => {
    toast.success('Plan deleted successfully (demo mode)');
  };

  const getPlanTypeColor = (type: string) => {
    switch (type) {
      case 'starter': return 'bg-blue-500';
      case 'growth': return 'bg-purple-500';
      case 'enterprise': return 'bg-green-500';
      case 'custom': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const formatPrice = (price: number | null, currency: string) => {
    return price ? `${currency === 'USD' ? '$' : '₹'}${price.toLocaleString()}` : 'Custom';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subscription Management</h1>
          <p className="text-muted-foreground">Manage subscription plans and tenant subscriptions</p>
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
            <CreatePlanForm onSubmit={createPlan} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">Active Subscriptions</TabsTrigger>
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
                          onClick={() => setSelectedPlan(plan)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePlan(plan.id)}
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
                        {plan.features.slice(0, 3).map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {feature}
                          </div>
                        ))}
                        {plan.features.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{plan.features.length - 3} more features
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

        <TabsContent value="subscriptions" className="space-y-4">
          {subscriptionsLoading ? (
            <div className="text-center py-8">Loading subscriptions...</div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Active Subscriptions</CardTitle>
                <CardDescription>Manage tenant subscriptions and billing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subscriptions.map((subscription) => (
                    <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-medium">{subscription.tenants?.name || 'Unknown Tenant'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {subscription.billing_plans?.name || 'Unknown Plan'} • {subscription.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                          {subscription.status}
                        </Badge>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Started: {new Date(subscription.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,231</div>
                <p className="text-xs text-muted-foreground">+20.1% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subscriptions.filter(s => s.status === 'active').length}</div>
                <p className="text-xs text-muted-foreground">+{subscriptions.length} total subscriptions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.3%</div>
                <p className="text-xs text-muted-foreground">-0.5% from last month</p>
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
    plan_type: 'starter' as const,
    base_price: '',
    currency: 'USD',
    billing_interval: 'monthly' as const,
    features: '',
    usage_limits: '',
    is_active: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const planData = {
      name: formData.name,
      description: formData.description,
      plan_type: formData.plan_type,
      base_price: formData.base_price ? parseFloat(formData.base_price) : 0,
      currency: formData.currency,
      billing_interval: formData.billing_interval,
      features: formData.features.split(',').map(f => f.trim()).filter(Boolean),
      usage_limits: formData.usage_limits ? JSON.parse(formData.usage_limits) : {},
      is_active: formData.is_active,
      is_custom: false,
      sort_order: 0
    };
    
    onSubmit(planData);
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
            onValueChange={(value: any) => setFormData({ ...formData, plan_type: value })}
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
          <Label htmlFor="base_price">Price</Label>
          <Input
            id="base_price"
            type="number"
            step="0.01"
            value={formData.base_price}
            onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
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
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="INR">INR</SelectItem>
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
        <Label htmlFor="features">Features (comma-separated)</Label>
        <Textarea
          id="features"
          value={formData.features}
          onChange={(e) => setFormData({ ...formData, features: e.target.value })}
          placeholder="Basic AI recommendations, Weather alerts, Up to 5 land plots"
        />
      </div>
      
      <div>
        <Label htmlFor="usage_limits">Usage Limits (JSON)</Label>
        <Textarea
          id="usage_limits"
          value={formData.usage_limits}
          onChange={(e) => setFormData({ ...formData, usage_limits: e.target.value })}
          placeholder='{"land_plots": 5, "api_calls": 1000}'
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>
      
      <Button type="submit" className="w-full">Create Plan</Button>
    </form>
  );
}
