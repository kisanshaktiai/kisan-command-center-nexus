
import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, AlertTriangle, Users, Zap } from 'lucide-react';

interface PerformanceMetrics {
  health_score: number;
  uptime_percentage: number;
  avg_response_time: number;
  error_rate: number;
  user_satisfaction: number;
}

interface PerformanceMetricsChartProps {
  metrics: PerformanceMetrics;
}

export const PerformanceMetricsChart: React.FC<PerformanceMetricsChartProps> = ({ metrics }) => {
  const healthData = [
    { name: 'Health Score', value: metrics.health_score, fill: '#10B981' },
    { name: 'Remaining', value: 100 - metrics.health_score, fill: '#E5E7EB' },
  ];

  const uptimeData = [
    { name: 'Uptime', value: metrics.uptime_percentage, fill: '#3B82F6' },
    { name: 'Downtime', value: 100 - metrics.uptime_percentage, fill: '#EF4444' },
  ];

  const satisfactionData = [
    { name: 'Satisfied', value: metrics.user_satisfaction, fill: '#10B981' },
    { name: 'Neutral', value: 100 - metrics.user_satisfaction, fill: '#F59E0B' },
  ];

  const getHealthBadge = (score: number) => {
    if (score >= 90) return <Badge variant="default" className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 75) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Good</Badge>;
    if (score >= 50) return <Badge variant="outline" className="bg-orange-100 text-orange-800">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  const getResponseTimeBadge = (time: number) => {
    if (time < 200) return <Badge variant="default" className="bg-green-100 text-green-800">Fast</Badge>;
    if (time < 500) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Good</Badge>;
    if (time < 1000) return <Badge variant="outline" className="bg-orange-100 text-orange-800">Slow</Badge>;
    return <Badge variant="destructive">Very Slow</Badge>;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Health Score */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="80%" data={[healthData[0]]}>
                <RadialBar dataKey="value" cornerRadius={10} fill="#10B981" />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2">
            <div className="text-2xl font-bold">{metrics.health_score}%</div>
            {getHealthBadge(metrics.health_score)}
          </div>
        </CardContent>
      </Card>

      {/* Uptime */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={uptimeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {uptimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2">
            <div className="text-2xl font-bold">{metrics.uptime_percentage}%</div>
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              {metrics.uptime_percentage >= 99 ? 'Excellent' : metrics.uptime_percentage >= 95 ? 'Good' : 'Poor'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Response Time */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-3xl font-bold">{metrics.avg_response_time.toFixed(0)}</div>
              <div className="text-sm text-muted-foreground">milliseconds</div>
            </div>
          </div>
          <div className="text-center mt-2">
            {getResponseTimeBadge(metrics.avg_response_time)}
          </div>
        </CardContent>
      </Card>

      {/* Error Rate */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{metrics.error_rate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">of requests</div>
            </div>
          </div>
          <div className="text-center mt-2">
            <Badge variant={metrics.error_rate < 1 ? "default" : metrics.error_rate < 5 ? "secondary" : "destructive"}>
              {metrics.error_rate < 1 ? 'Excellent' : metrics.error_rate < 5 ? 'Good' : 'High'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* User Satisfaction */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">User Satisfaction</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="80%" data={[satisfactionData[0]]}>
                <RadialBar dataKey="value" cornerRadius={10} fill="#10B981" />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2">
            <div className="text-2xl font-bold">{metrics.user_satisfaction}%</div>
            <Badge variant="default" className="bg-green-100 text-green-800">
              {metrics.user_satisfaction >= 80 ? 'High' : metrics.user_satisfaction >= 60 ? 'Medium' : 'Low'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
