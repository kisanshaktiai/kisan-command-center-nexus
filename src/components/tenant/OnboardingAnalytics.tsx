
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle, Users } from 'lucide-react';

interface OnboardingAnalyticsProps {
  workflows: any[];
}

export const OnboardingAnalytics: React.FC<OnboardingAnalyticsProps> = ({ workflows }) => {
  const calculateStats = () => {
    const total = workflows.length;
    const completed = workflows.filter(w => w.status === 'completed').length;
    const inProgress = workflows.filter(w => w.status === 'in_progress').length;
    const failed = workflows.filter(w => w.status === 'failed').length;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Calculate average completion time
    const completedWorkflows = workflows.filter(w => w.status === 'completed' && w.completed_at);
    const avgDuration = completedWorkflows.length > 0 ? 
      completedWorkflows.reduce((acc, w) => {
        const duration = new Date(w.completed_at!).getTime() - new Date(w.started_at).getTime();
        return acc + duration;
      }, 0) / completedWorkflows.length / (1000 * 60 * 60 * 24) : 0; // Convert to days
    
    return {
      total,
      completed,
      inProgress,
      failed,
      completionRate,
      avgDuration: Math.round(avgDuration * 10) / 10
    };
  };

  const stats = calculateStats();

  const getCompletionTrend = () => {
    // Calculate trend based on recent completions
    const recentWeek = workflows.filter(w => 
      w.completed_at && 
      new Date(w.completed_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;
    
    const previousWeek = workflows.filter(w => 
      w.completed_at && 
      new Date(w.completed_at).getTime() > Date.now() - 14 * 24 * 60 * 60 * 1000 &&
      new Date(w.completed_at).getTime() <= Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;
    
    return recentWeek > previousWeek ? 'up' : recentWeek < previousWeek ? 'down' : 'stable';
  };

  const trend = getCompletionTrend();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            Active onboarding processes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completionRate}%</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            ) : null}
            <span>{stats.completed} of {stats.total} completed</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.inProgress}</div>
          <p className="text-xs text-muted-foreground">
            Active workflows
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgDuration}d</div>
          <p className="text-xs text-muted-foreground">
            Average completion time
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
