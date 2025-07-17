
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreditCard, DollarSign, Package, TrendingUp, Users, Calendar, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  plan_type: 'basic' | 'premium' | 'enterprise' | 'custom';
  price_monthly: number;
  price_quarterly: number;
  price_annually: number;
  features: string[];
  limits: any;
  is_active: boolean;
  is_custom: boolean;
  tenant_id?: string;
}

interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  billing_interval: 'monthly' | 'quarterly' | 'annually';
  status: string;
  current_period_start: string;
  current_period_end: string;
  auto_renew: boolean;
  payment_method: any;
  tenant_name?: string;
  plan_name?: string;
}

export default function SubscriptionManagement() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const [plansData, subscriptionsData] = await Promise.all([
        supabase
          .from('subscription_plans')
          .select('*')
          .order('price_monthly', { ascending: true }),
        supabase
          .from('tenant_subscriptions')
          .select(`
            *,
            tenants:tenant_id (name),
            subscription_plans:plan_id (name)
          `)
          .order('created_at', { ascending: false })
      ]);

      if (plansData.error) throw plansData.error;
      if (subscriptionsData.error) throw subscriptionsData.error;

      setPlans(plansData.data || []);
      
      const formattedSubscriptions = subscriptionsData.data?.map(sub => ({
        ...sub,
        tenant_name: sub.tenants?.name || 'Unknown Tenant',
        plan_name: sub.subscription_plans?.name || 'Unknown Plan'
      })) || [];
      
      setSubscriptions(formattedSubscriptions);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const getPlanTypeColor = (type: string) => {
    switch (type) {
      case 'basic':
        return 'bg-blue-100 text-blue-800';
      case 'premium':
        return 'bg-purple-100 text-purple-800';
      case 'enterprise':
        return 'bg-orange-100 text-orange-800';
      case 'custom':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      case 'paused':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
          <p className="text-muted-foreground">
            Manage subscription plans, pricing, and tenant subscriptions
          </p>
        </div>
        <Dialog open={showCreatePlan} onOpenChange={setShowCreatePlan}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Plan</DialogTitle>
              <DialogDescription>
                Create a new subscription plan with custom features and pricing
              </DialogDescription>
            </DialogHeader>
            <PlanForm 
              onSave={() => {
                setShowCreatePlan(false);
                fetchSubscriptionData();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions.filter(s => s.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              +5 new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Plans</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.filter(p => p.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {plans.filter(p => p.is_custom).length} custom plans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+23%</div>
            <p className="text-xs text-muted-foreground">
              Month over month
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">Active Subscriptions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <PlansList 
            plans={plans}
            onEdit={(plan) => setEditingPlan(plan)}
            onRefresh={fetchSubscriptionData}
          />
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <SubscriptionsList subscriptions={subscriptions} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <SubscriptionAnalytics 
            plans={plans}
            subscriptions={subscriptions}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>
              Update plan details, pricing, and features
            </DialogDescription>
          </DialogHeader>
          {editingPlan && (
            <PlanForm 
              plan={editingPlan}
              onSave={() => {
                setEditingPlan(null);
                fetchSubscriptionData();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlansList({ plans, onEdit, onRefresh }: {
  plans: SubscriptionPlan[];
  onEdit: (plan: SubscriptionPlan) => void;
  onRefresh: () => void;
}) {
  const deletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast.success('Plan deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{plan.name}</span>
                    <Badge className={getPlanTypeColor(plan.plan_type)}>
                      {plan.plan_type}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onEdit(plan)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deletePlan(plan.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Monthly</span>
                  <span className="font-semibold">${plan.price_monthly}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Quarterly</span>
                  <span className="font-semibold">${plan.price_quarterly}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Annually</span>
                  <span className="font-semibold">${plan.price_annually}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Features</h4>
                <div className="space-y-1">
                  {plan.features?.slice(0, 3).map((feature, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      • {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  ))}
                  {plan.features?.length > 3 && (
                    <div className="text-sm text-muted-foreground">
                      • +{plan.features.length - 3} more features
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {plan.is_custom && (
                  <Badge variant="outline">Custom</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SubscriptionsList({ subscriptions }: { subscriptions: TenantSubscription[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Subscriptions</CardTitle>
        <CardDescription>
          Manage tenant subscriptions and billing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Next Billing</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((subscription) => (
              <TableRow key={subscription.id}>
                <TableCell className="font-medium">
                  {subscription.tenant_name}
                </TableCell>
                <TableCell>{subscription.plan_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {subscription.billing_interval}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(subscription.status)}>
                    {subscription.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SubscriptionAnalytics({ plans, subscriptions }: {
  plans: SubscriptionPlan[];
  subscriptions: TenantSubscription[];
}) {
  const planDistribution = plans.map(plan => ({
    name: plan.name,
    count: subscriptions.filter(sub => sub.plan_id === plan.id).length,
    revenue: subscriptions
      .filter(sub => sub.plan_id === plan.id)
      .reduce((total, sub) => {
        const monthlyPrice = plan.price_monthly || 0;
        const multiplier = sub.billing_interval === 'annually' ? 12 : 
                          sub.billing_interval === 'quarterly' ? 3 : 1;
        return total + (monthlyPrice * multiplier);
      }, 0)
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>
              Number of subscriptions per plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {planDistribution.map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="outline">{item.count} subscriptions</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
            <CardDescription>
              Monthly recurring revenue breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {planDistribution.map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <span className="font-medium">{item.name}</span>
                  <span className="font-semibold">${item.revenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing Intervals</CardTitle>
          <CardDescription>
            Distribution of billing frequencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {['monthly', 'quarterly', 'annually'].map((interval) => {
              const count = subscriptions.filter(sub => sub.billing_interval === interval).length;
              const percentage = (count / subscriptions.length * 100).toFixed(1);
              
              return (
                <div key={interval} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {interval} ({percentage}%)
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlanForm({ plan, onSave }: { 
  plan?: SubscriptionPlan; 
  onSave: () => void; 
}) {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    plan_type: plan?.plan_type || 'basic',
    price_monthly: plan?.price_monthly || 0,
    price_quarterly: plan?.price_quarterly || 0,
    price_annually: plan?.price_annually || 0,
    features: plan?.features || [],
    limits: plan?.limits || {},
    is_active: plan?.is_active ?? true,
    is_custom: plan?.is_custom || false
  });

  const [newFeature, setNewFeature] = useState('');
  const [saving, setSaving] = useState(false);

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (plan) {
        // Update existing plan
        const { error } = await supabase
          .from('subscription_plans')
          .update(formData)
          .eq('id', plan.id);

        if (error) throw error;
        toast.success('Plan updated successfully');
      } else {
        // Create new plan
        const { error } = await supabase
          .from('subscription_plans')
          .insert(formData);

        if (error) throw error;
        toast.success('Plan created successfully');
      }

      onSave();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Plan Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Plan name"
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
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
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
          placeholder="Plan description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="price_monthly">Monthly Price ($)</Label>
          <Input
            id="price_monthly"
            type="number"
            step="0.01"
            value={formData.price_monthly}
            onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="price_quarterly">Quarterly Price ($)</Label>
          <Input
            id="price_quarterly"
            type="number"
            step="0.01"
            value={formData.price_quarterly}
            onChange={(e) => setFormData({ ...formData, price_quarterly: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="price_annually">Annual Price ($)</Label>
          <Input
            id="price_annually"
            type="number"
            step="0.01"
            value={formData.price_annually}
            onChange={(e) => setFormData({ ...formData, price_annually: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <Label>Features</Label>
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Input
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="Add a feature"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
            />
            <Button type="button" onClick={addFeature}>Add</Button>
          </div>
          <div className="space-y-1">
            {formData.features.map((feature, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                <span>{feature}</span>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  onClick={() => removeFeature(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
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
          <Label htmlFor="is_custom">Custom Plan</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onSave}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : (plan ? 'Update Plan' : 'Create Plan')}
        </Button>
      </div>
    </form>
  );
}

function getPlanTypeColor(type: string) {
  switch (type) {
    case 'basic':
      return 'bg-blue-100 text-blue-800';
    case 'premium':
      return 'bg-purple-100 text-purple-800';
    case 'enterprise':
      return 'bg-orange-100 text-orange-800';
    case 'custom':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'past_due':
      return 'bg-yellow-100 text-yellow-800';
    case 'paused':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
