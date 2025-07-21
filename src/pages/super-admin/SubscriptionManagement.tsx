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
import { CheckCircle, Plus, Edit, Trash2, DollarSign, Users, Calendar, Loader2, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface BillingPlan {
  id: string;
  name: string;
  description: string | null;
  plan_type?: string;
  base_price: number;
  currency?: string;
  billing_interval: string;
  features: any[];
  usage_limits?: any;
  limits?: any;
  is_active: boolean;
  is_custom?: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantSubscription {
  id: string;
  name: string;
  subscription_plan: string;
  status: string;
  created_at: string;
  trial_ends_at?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  type: string;
  owner_email?: string;
}

// Helper function to safely convert Json to array
const convertJsonToArray = (jsonValue: any): any[] => {
  if (Array.isArray(jsonValue)) {
    return jsonValue;
  }
  if (typeof jsonValue === 'string') {
    try {
      const parsed = JSON.parse(jsonValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (jsonValue && typeof jsonValue === 'object') {
    return Object.keys(jsonValue);
  }
  return [];
};

export default function SubscriptionManagement() {
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  
  const queryClient = useQueryClient();

  // Fetch billing plans
  const { data: plans = [], isLoading: plansLoading, error: plansError } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: async (): Promise<BillingPlan[]> => {
      console.log('Fetching billing plans...');
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching billing plans:', error);
        throw error;
      }

      console.log('Billing plans fetched:', data);
      
      // Transform the data to match our interface
      return (data || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        plan_type: plan.plan_type,
        base_price: plan.base_price,
        currency: plan.currency,
        billing_interval: plan.billing_interval,
        features: convertJsonToArray(plan.features),
        usage_limits: plan.usage_limits,
        limits: plan.limits,
        is_active: plan.is_active,
        is_custom: plan.is_custom,
        created_at: plan.created_at,
        updated_at: plan.updated_at
      }));
    },
  });

  // Fetch tenant subscriptions
  const { data: subscriptions = [], isLoading: subscriptionsLoading, error: subscriptionsError } = useQuery({
    queryKey: ['tenant-subscriptions-admin'],
    queryFn: async (): Promise<TenantSubscription[]> => {
      console.log('Fetching tenant subscriptions...');
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, subscription_plan, status, created_at, trial_ends_at, subscription_start_date, subscription_end_date, type, owner_email')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tenant subscriptions:', error);
        throw error;
      }

      console.log('Tenant subscriptions fetched:', data);
      return data || [];
    },
  });

  // Calculate analytics
  const analytics = React.useMemo(() => {
    if (!subscriptions.length) return { totalRevenue: 0, activeSubscriptions: 0, churnRate: 0 };

    const activeCount = subscriptions.filter(sub => sub.status === 'active').length;
    const totalCount = subscriptions.length;
    const churnRate = totalCount > 0 ? ((totalCount - activeCount) / totalCount) * 100 : 0;

    // Calculate revenue based on plan pricing
    const totalRevenue = subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((sum, sub) => {
        const plan = plans.find(p => p.name.toLowerCase().includes(sub.subscription_plan.toLowerCase()));
        return sum + (plan?.base_price || 0);
      }, 0);

    return {
      totalRevenue,
      activeSubscriptions: activeCount,
      churnRate: churnRate.toFixed(1),
    };
  }, [subscriptions, plans]);

  const createPlan = async (planData: any) => {
    try {
      console.log('Creating billing plan:', planData);
      const { data, error } = await supabase
        .from('billing_plans')
        .insert([planData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Billing plan created successfully');
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['billing-plans'] });
    } catch (error: any) {
      console.error('Error creating billing plan:', error);
      toast.error(`Failed to create billing plan: ${error.message}`);
    }
  };

  const updatePlan = async (planData: any) => {
    if (!selectedPlan) return;

    try {
      console.log('Updating billing plan:', planData);
      const { data, error } = await supabase
        .from('billing_plans')
        .update(planData)
        .eq('id', selectedPlan.id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Billing plan updated successfully');
      setIsEditDialogOpen(false);
      setSelectedPlan(null);
      queryClient.invalidateQueries({ queryKey: ['billing-plans'] });
    } catch (error: any) {
      console.error('Error updating billing plan:', error);
      toast.error(`Failed to update billing plan: ${error.message}`);
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      console.log('Deleting billing plan:', planId);
      const { error } = await supabase
        .from('billing_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast.success('Billing plan deleted successfully');
      setPlanToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['billing-plans'] });
    } catch (error: any) {
      console.error('Error deleting billing plan:', error);
      toast.error(`Failed to delete billing plan: ${error.message}`);
    }
  };

  const getPlanTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'kisan_basic':
      case 'starter': return 'bg-blue-500';
      case 'shakti_growth':
      case 'growth': return 'bg-purple-500';
      case 'ai_enterprise':
      case 'enterprise': return 'bg-green-500';
      case 'custom': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const formatPrice = (price: number | null, currency: string = 'INR') => {
    return price ? `${currency === 'USD' ? '$' : '₹'}${price.toLocaleString()}` : 'Custom';
  };

  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case 'Kisan_Basic': return 'Kisan – Starter';
      case 'Shakti_Growth': return 'Shakti – Growth';
      case 'AI_Enterprise': return 'AI – Enterprise';
      case 'custom': return 'Custom Plan';
      default: return plan;
    }
  };

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.subscription_plan?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesPlan = planFilter === 'all' || sub.subscription_plan === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  if (plansError || subscriptionsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading data</p>
          <p className="text-sm text-muted-foreground">
            {plansError?.message || subscriptionsError?.message}
          </p>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading plans...</span>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.id} className="relative">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {plan.name}
                          <Badge className={getPlanTypeColor(plan.plan_type || 'starter')}>
                            {plan.plan_type || 'starter'}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPlanToDelete(plan.id)}
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
                        {(plan.features || []).slice(0, 3).map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {typeof feature === 'string' ? feature : JSON.stringify(feature)}
                          </div>
                        ))}
                        {(plan.features || []).length > 3 && (
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
              
              {plans.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">No billing plans found. Create your first plan to get started.</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          {/* Search and Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tenants or plans..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="Kisan_Basic">Kisan – Starter</SelectItem>
                    <SelectItem value="Shakti_Growth">Shakti – Growth</SelectItem>
                    <SelectItem value="AI_Enterprise">AI – Enterprise</SelectItem>
                    <SelectItem value="custom">Custom Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {subscriptionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading subscriptions...</span>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Active Subscriptions ({filteredSubscriptions.length})</CardTitle>
                <CardDescription>Manage tenant subscriptions and billing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredSubscriptions.map((subscription) => (
                    <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-medium">{subscription.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge className={getPlanTypeColor(subscription.subscription_plan)}>
                              {getPlanDisplayName(subscription.subscription_plan)}
                            </Badge>
                            <span>•</span>
                            <span>{subscription.type}</span>
                            {subscription.owner_email && (
                              <>
                                <span>•</span>
                                <span>{subscription.owner_email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                          {subscription.status}
                        </Badge>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {subscription.trial_ends_at ? (
                              `Trial ends: ${new Date(subscription.trial_ends_at).toLocaleDateString()}`
                            ) : subscription.subscription_end_date ? (
                              `Ends: ${new Date(subscription.subscription_end_date).toLocaleDateString()}`
                            ) : (
                              'No end date'
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Started: {new Date(subscription.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredSubscriptions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {subscriptions.length === 0 
                        ? "No subscriptions found. Tenants will appear here once they're created."
                        : "No subscriptions match your current filters."
                      }
                    </div>
                  )}
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
                <div className="text-2xl font-bold">₹{analytics.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">From active subscriptions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.activeSubscriptions}</div>
                <p className="text-xs text-muted-foreground">+{subscriptions.length} total tenants</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.churnRate}%</div>
                <p className="text-xs text-muted-foreground">Non-active subscriptions</p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Analytics */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['Kisan_Basic', 'Shakti_Growth', 'AI_Enterprise', 'custom'].map((plan) => {
                    const count = subscriptions.filter(s => s.subscription_plan === plan).length;
                    const percentage = subscriptions.length > 0 ? (count / subscriptions.length) * 100 : 0;
                    return (
                      <div key={plan} className="flex justify-between items-center">
                        <span className="text-sm">{getPlanDisplayName(plan)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{count}</span>
                          <span className="text-xs text-muted-foreground">({percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['active', 'trial', 'suspended', 'cancelled'].map((status) => {
                    const count = subscriptions.filter(s => s.status === status).length;
                    const percentage = subscriptions.length > 0 ? (count / subscriptions.length) * 100 : 0;
                    return (
                      <div key={status} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{status}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{count}</span>
                          <span className="text-xs text-muted-foreground">({percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Billing Plan</DialogTitle>
            <DialogDescription>Update the billing plan configuration</DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <CreatePlanForm 
              onSubmit={updatePlan} 
              initialData={selectedPlan}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Plan Confirmation */}
      <AlertDialog open={!!planToDelete} onOpenChange={() => setPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Billing Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this billing plan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => planToDelete && deletePlan(planToDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Create/Edit Plan Form Component
function CreatePlanForm({ 
  onSubmit, 
  initialData, 
  isEditing = false 
}: { 
  onSubmit: (data: any) => void; 
  initialData?: BillingPlan;
  isEditing?: boolean;
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    plan_type: initialData?.plan_type || 'starter',
    base_price: initialData?.base_price?.toString() || '',
    currency: initialData?.currency || 'INR',
    billing_interval: initialData?.billing_interval || 'monthly',
    features: Array.isArray(initialData?.features) ? initialData.features.join(', ') : '',
    usage_limits: initialData?.usage_limits ? JSON.stringify(initialData.usage_limits) : initialData?.limits ? JSON.stringify(initialData.limits) : '',
    is_active: initialData?.is_active ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let features = [];
    try {
      features = formData.features.split(',').map(f => f.trim()).filter(Boolean);
    } catch {
      features = [];
    }

    let usage_limits = {};
    try {
      usage_limits = formData.usage_limits ? JSON.parse(formData.usage_limits) : {};
    } catch {
      usage_limits = {};
    }
    
    const planData = {
      name: formData.name,
      description: formData.description,
      plan_type: formData.plan_type,
      base_price: formData.base_price ? parseFloat(formData.base_price) : 0,
      currency: formData.currency,
      billing_interval: formData.billing_interval,
      features,
      usage_limits,
      limits: usage_limits, // Also store in limits for backward compatibility
      is_active: formData.is_active,
      is_custom: false
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
      
      <Button type="submit" className="w-full">
        {isEditing ? 'Update Plan' : 'Create Plan'}
      </Button>
    </form>
  );
}
