import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Edit, Trash2, Crown, Zap, Star } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];

interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan;
  onEdit?: (plan: SubscriptionPlan) => void;
  onDelete?: (planId: string) => void;
  showActions?: boolean;
}

const planIcons = {
  basic: Star,
  premium: Zap,
  enterprise: Crown,
  custom: Star,
};

export function SubscriptionPlanCard({ 
  plan, 
  onEdit, 
  onDelete, 
  showActions = true 
}: SubscriptionPlanCardProps) {
  const formatPrice = (price: number | null) => {
    if (!price) return 'Custom';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const features = Array.isArray(plan.features) 
    ? plan.features as string[]
    : plan.features 
      ? Object.keys(plan.features as Record<string, any>)
      : [];

  const limits = plan.limits as Record<string, any> || {};
  
  const Icon = planIcons[plan.plan_type] || Star;

  // Determine if this is a popular/featured plan
  const isPopular = plan.plan_type === 'premium';

  return (
    <Card className={`relative ${isPopular ? 'border-primary shadow-lg' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary">Most Popular</Badge>
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              {plan.plan_category && (
                <Badge variant="outline" className="mt-1">
                  {plan.plan_category}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            {!plan.is_active && <Badge variant="secondary">Inactive</Badge>}
            {plan.is_custom && <Badge variant="outline">Custom</Badge>}
          </div>
        </div>
        {plan.description && (
          <CardDescription className="mt-2">{plan.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pricing */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{formatPrice(plan.price_monthly)}</span>
            <span className="text-muted-foreground">/month</span>
          </div>
          
          {plan.price_quarterly && (
            <div className="text-sm text-muted-foreground">
              {formatPrice(plan.price_quarterly)} quarterly
            </div>
          )}
          
          {plan.price_annually && (
            <div className="text-sm text-muted-foreground">
              {formatPrice(plan.price_annually)} annually
              {plan.price_monthly && plan.price_annually < plan.price_monthly * 12 && (
                <Badge variant="secondary" className="ml-2">
                  Save {Math.round((1 - plan.price_annually / (plan.price_monthly * 12)) * 100)}%
                </Badge>
              )}
            </div>
          )}

          {plan.trial_days && plan.trial_days > 0 && (
            <Badge variant="outline" className="mt-2">
              {plan.trial_days} days free trial
            </Badge>
          )}
        </div>

        {/* Features */}
        {features.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Features</h4>
            <ul className="space-y-2">
              {features.slice(0, 5).map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{typeof feature === 'string' ? feature : JSON.stringify(feature)}</span>
                </li>
              ))}
            </ul>
            {features.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{features.length - 5} more features
              </p>
            )}
          </div>
        )}

        {/* Limits */}
        {Object.keys(limits).length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-semibold text-sm">Limits</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(limits).slice(0, 4).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stripe Integration Status */}
        {plan.stripe_product_id && (
          <div className="pt-2 border-t">
            <Badge variant="outline" className="text-xs">
              Stripe Integrated
            </Badge>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="flex gap-2">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(plan)}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(plan.id)}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
