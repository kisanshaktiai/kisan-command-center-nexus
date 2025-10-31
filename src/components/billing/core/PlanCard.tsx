import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import type { Plan } from '@/types/billing/unified';
import { currencyService } from '@/services/billing/CurrencyService';

interface PlanCardProps {
  plan: Plan;
  onSelect?: (plan: Plan) => void;
  isSelected?: boolean;
  isLoading?: boolean;
  showGlobalBadge?: boolean;
}

export function PlanCard({ 
  plan, 
  onSelect, 
  isSelected = false, 
  isLoading = false,
  showGlobalBadge = true 
}: PlanCardProps) {
  const features = Object.entries(plan.features || {}).filter(([_, value]) => value === true);
  const limits = Object.entries(plan.limits || {});

  return (
    <Card className={`relative ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      {plan.is_global && showGlobalBadge && (
        <Badge className="absolute top-4 right-4" variant="secondary">
          Global
        </Badge>
      )}
      
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {plan.title}
          {isSelected && <Check className="h-5 w-5 text-primary" />}
        </CardTitle>
        {plan.description && (
          <CardDescription>{plan.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price */}
        <div>
          <div className="text-3xl font-bold">
            {currencyService.formatCurrency(plan.price, plan.currency as any)}
          </div>
          <div className="text-sm text-muted-foreground">
            for {plan.duration_days} days
          </div>
        </div>

        {/* Features */}
        {features.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-sm">Features</h4>
            <ul className="space-y-1">
              {features.map(([key, _]) => (
                <li key={key} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Limits */}
        {limits.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-sm">Limits</h4>
            <ul className="space-y-1">
              {limits.map(([key, value]) => (
                <li key={key} className="text-sm text-muted-foreground">
                  <span className="capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                  <span className="font-medium text-foreground">
                    {value === -1 ? 'Unlimited' : value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      {onSelect && (
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={() => onSelect(plan)}
            disabled={isLoading || !plan.is_active}
            variant={isSelected ? 'default' : 'outline'}
          >
            {isLoading ? 'Processing...' : isSelected ? 'Selected' : 'Select Plan'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
