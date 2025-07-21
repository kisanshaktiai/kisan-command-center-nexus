
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Calendar, DollarSign, Users, Package, Zap, Globe } from 'lucide-react';

interface BillingPlan {
  id: string;
  name: string;
  description: string;
  base_price: number;
  billing_interval: string;
  features: any;
  limits: any;
  is_active: boolean;
}

interface SubscriptionDetailModalProps {
  subscription: any;
  plan: BillingPlan | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionDetailModal: React.FC<SubscriptionDetailModalProps> = ({
  subscription,
  plan,
  isOpen,
  onClose,
}) => {
  if (!subscription) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500 text-white';
      case 'trial': return 'bg-blue-500 text-white';
      case 'suspended': return 'bg-yellow-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(price);
  };

  const features = plan?.features ? Object.entries(plan.features) : [];
  const limits = plan?.limits ? Object.entries(plan.limits) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <DollarSign className="h-6 w-6" />
            {subscription.name} - Subscription Details
            <Badge className={getStatusColor(subscription.status)}>
              {subscription.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subscription Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Subscription Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tenant Name</label>
                  <p className="font-medium">{subscription.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Plan</label>
                  <p className="font-medium">{subscription.subscription_plan}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="capitalize">{subscription.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Owner</label>
                  <p className="text-sm">{subscription.owner_email || 'Not specified'}</p>
                </div>
              </div>

              {plan && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-muted-foreground">Plan Pricing</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold">{formatPrice(plan.base_price)}</span>
                    <span className="text-muted-foreground">/ {plan.billing_interval}</span>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="font-medium">
                  {new Date(subscription.created_at).toLocaleDateString()}
                </span>
              </div>
              
              {subscription.trial_ends_at && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Trial Ends</span>
                  <span className="font-medium">
                    {new Date(subscription.trial_ends_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {subscription.subscription_start_date && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Started</span>
                  <span className="font-medium">
                    {new Date(subscription.subscription_start_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {subscription.subscription_end_date && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Ends</span>
                  <span className="font-medium">
                    {new Date(subscription.subscription_end_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Features */}
          {features.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Plan Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {features.map(([feature, enabled]) => (
                    <div key={feature} className="flex items-center gap-2">
                      {enabled ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {String(feature).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage Limits */}
          {limits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usage Limits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {limits.map(([limit, value]) => (
                    <div key={limit} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {String(limit).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="font-medium">
                        {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="default">
            Manage Subscription
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
