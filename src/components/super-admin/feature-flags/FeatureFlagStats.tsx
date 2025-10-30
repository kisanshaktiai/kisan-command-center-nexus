import { Card } from '@/components/ui/card';
import { Flag, TrendingUp, Target, Activity } from 'lucide-react';

interface FeatureFlagStatsProps {
  stats: {
    total: number;
    active: number;
    experiments: number;
    targeted: number;
    totalEvaluationsToday: number;
  };
}

export function FeatureFlagStats({ stats }: FeatureFlagStatsProps) {
  const statCards = [
    {
      title: 'Total Flags',
      value: stats.total,
      icon: Flag,
      description: 'All feature flags',
      color: 'text-primary'
    },
    {
      title: 'Active Flags',
      value: stats.active,
      icon: Activity,
      description: 'Currently enabled',
      color: 'text-success'
    },
    {
      title: 'Experiments',
      value: stats.experiments,
      icon: TrendingUp,
      description: 'A/B tests running',
      color: 'text-warning'
    },
    {
      title: 'Targeted Flags',
      value: stats.targeted,
      icon: Target,
      description: 'With tenant targeting',
      color: 'text-info'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat) => (
        <Card key={stat.title} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </div>
            <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </div>
        </Card>
      ))}
      
      <Card className="p-6 hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Evaluations Today</p>
            <p className="text-3xl font-bold">{stats.totalEvaluationsToday.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Real-time flag evaluations across all tenants</p>
          </div>
          <div className="p-3 rounded-full bg-muted text-primary">
            <Activity className="h-6 w-6" />
          </div>
        </div>
      </Card>
    </div>
  );
}
