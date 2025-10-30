import { useQuery } from '@tanstack/react-query';
import { EnhancedFeatureService } from '@/services/EnhancedFeatureService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, CheckCircle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function AnalyticsTab() {
  const { data: evaluationStats, isLoading } = useQuery({
    queryKey: ['feature-flag-evaluation-stats'],
    queryFn: () => EnhancedFeatureService.getEvaluationStats(7)
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading analytics...</div>;
  }

  if (!evaluationStats || evaluationStats.length === 0) {
    return (
      <Card className="p-12 text-center">
        <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No evaluation data available yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Analytics will appear once feature flags are evaluated by tenants
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Flag Performance (Last 7 Days)</h3>
        <p className="text-sm text-muted-foreground">
          Real-time evaluation statistics across all tenants
        </p>
      </div>

      <div className="grid gap-4">
        {evaluationStats.map((stat) => {
          const enabledPercentage = stat.total_evaluations > 0 
            ? (stat.enabled_count / stat.total_evaluations) * 100 
            : 0;

          return (
            <Card key={stat.flag_name} className="p-6 hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">{stat.flag_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {stat.total_evaluations.toLocaleString()} total evaluations
                    </p>
                  </div>
                  <Badge variant="outline" className="text-primary">
                    {enabledPercentage.toFixed(1)}% enabled
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Adoption Rate</span>
                    <span className="font-medium">{enabledPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={enabledPercentage} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-xs text-muted-foreground">Enabled</p>
                      <p className="font-semibold">{stat.enabled_count.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Disabled</p>
                      <p className="font-semibold">{stat.disabled_count.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-info" />
                    <div>
                      <p className="text-xs text-muted-foreground">Unique Tenants</p>
                      <p className="font-semibold">{stat.unique_tenants}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
