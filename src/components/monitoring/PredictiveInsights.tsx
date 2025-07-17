
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  AlertTriangle, 
  Target, 
  DollarSign,
  Users,
  Server,
  Lightbulb
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const PredictiveInsights = () => {
  // Mock predictive data
  const capacityForecast = [
    { month: 'Jul', current: 78, predicted: 82, threshold: 85 },
    { month: 'Aug', current: 82, predicted: 88, threshold: 85 },
    { month: 'Sep', current: 88, predicted: 94, threshold: 85 },
    { month: 'Oct', current: 94, predicted: 102, threshold: 85 },
    { month: 'Nov', current: 102, predicted: 108, threshold: 85 },
    { month: 'Dec', current: 108, predicted: 115, threshold: 85 },
  ];

  const churnPredictions = [
    { tenant: 'TechFarm Solutions', risk_score: 85, factors: ['usage_decline', 'support_tickets'], revenue_impact: 2400 },
    { tenant: 'AgroData Inc', risk_score: 72, factors: ['payment_delays', 'feature_requests'], revenue_impact: 1800 },
    { tenant: 'GreenCorp Ltd', risk_score: 68, factors: ['low_engagement'], revenue_impact: 3200 },
    { tenant: 'FarmTech Pro', risk_score: 45, factors: ['pricing_inquiries'], revenue_impact: 1200 },
  ];

  const revenueForecast = [
    { month: 'Jul', actual: 45231, predicted: 45231, lower_bound: 42500, upper_bound: 48000 },
    { month: 'Aug', actual: null, predicted: 47500, lower_bound: 44800, upper_bound: 50200 },
    { month: 'Sep', actual: null, predicted: 49200, lower_bound: 46100, upper_bound: 52300 },
    { month: 'Oct', actual: null, predicted: 51800, lower_bound: 48400, upper_bound: 55200 },
    { month: 'Nov', actual: null, predicted: 54100, lower_bound: 50600, upper_bound: 57600 },
    { month: 'Dec', actual: null, predicted: 56800, lower_bound: 53100, upper_bound: 60500 },
  ];

  const scalingRecommendations = [
    {
      category: 'Infrastructure',
      priority: 'high',
      recommendation: 'Scale database replicas by 40% before Q4',
      impact: 'Prevents performance degradation',
      cost: '$2,400/month',
      timeline: '2 weeks'
    },
    {
      category: 'AI Models',
      priority: 'medium',
      recommendation: 'Optimize GPT-4 query batching',
      impact: 'Reduce AI costs by 25%',
      cost: 'Engineering time',
      timeline: '1 month'
    },
    {
      category: 'Storage',
      priority: 'low',
      recommendation: 'Implement data archiving for 1+ year old data',
      impact: 'Reduce storage costs by 30%',
      cost: '$800 setup',
      timeline: '3 weeks'
    }
  ];

  const costOptimizations = [
    {
      area: 'AI Model Usage',
      current_cost: 8500,
      optimized_cost: 6400,
      savings: 2100,
      confidence: 92
    },
    {
      area: 'Database Resources',
      current_cost: 3200,
      optimized_cost: 2400,
      savings: 800,
      confidence: 85
    },
    {
      area: 'Storage & CDN',
      current_cost: 1800,
      optimized_cost: 1350,
      savings: 450,
      confidence: 78
    }
  ];

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskBadge = (score: number) => {
    if (score >= 80) return 'destructive';
    if (score >= 60) return 'secondary';
    return 'default';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Predictive Insights</h2>
        <p className="text-muted-foreground">
          AI-powered forecasts and recommendations for platform optimization
        </p>
      </div>

      {/* Key Predictions Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacity Alert</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">Oct 2024</div>
            <p className="text-xs text-muted-foreground">
              Expected to hit 85% capacity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Risk</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">4</div>
            <p className="text-xs text-muted-foreground">
              High-risk tenants ($8.6K revenue)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Forecast</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$56.8K</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              Predicted Dec 2024 MRR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$3.35K</div>
            <p className="text-xs text-muted-foreground">
              Monthly optimization potential
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Capacity Planning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Capacity Planning Forecast
          </CardTitle>
          <CardDescription>Predicted resource utilization and scaling requirements</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={capacityForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="current" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2} 
                name="Current Usage %" 
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="hsl(var(--secondary))" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                name="Predicted Usage %" 
              />
              <Line 
                type="monotone" 
                dataKey="threshold" 
                stroke="#ef4444" 
                strokeWidth={2} 
                strokeDasharray="2 2"
                name="Critical Threshold" 
              />
            </LineChart>
          </ResponsiveContainer>
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> System capacity will exceed safe operating levels by October 2024. 
              Consider scaling infrastructure by September.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Revenue Prediction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Projections
          </CardTitle>
          <CardDescription>6-month revenue forecast with confidence intervals</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => value ? `$${value.toLocaleString()}` : 'N/A'} />
              <Area 
                type="monotone" 
                dataKey="upper_bound" 
                stackId="1"
                stroke="none" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.1} 
              />
              <Area 
                type="monotone" 
                dataKey="lower_bound" 
                stackId="1"
                stroke="none" 
                fill="white" 
                fillOpacity={1} 
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2} 
                name="Predicted Revenue" 
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="hsl(var(--secondary))" 
                strokeWidth={2} 
                name="Actual Revenue" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Churn Risk Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Churn Risk Predictions
          </CardTitle>
          <CardDescription>Tenants at risk of churning with contributing factors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {churnPredictions.map((tenant) => (
              <div key={tenant.tenant} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{tenant.tenant}</h4>
                    <p className="text-sm text-muted-foreground">
                      Revenue Impact: ${tenant.revenue_impact.toLocaleString()}/month
                    </p>
                  </div>
                  <Badge variant={getRiskBadge(tenant.risk_score)}>
                    {tenant.risk_score}% Risk
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Churn Probability</span>
                    <span className={getRiskColor(tenant.risk_score)}>
                      {tenant.risk_score}%
                    </span>
                  </div>
                  <Progress value={tenant.risk_score} className="h-2" />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tenant.factors.map((factor) => (
                      <Badge key={factor} variant="outline" className="text-xs">
                        {factor.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scaling Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Scaling Recommendations
          </CardTitle>
          <CardDescription>AI-generated recommendations for platform scaling</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scalingRecommendations.map((rec, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{rec.category}</h4>
                    <Badge variant={getPriorityColor(rec.priority)}>
                      {rec.priority} priority
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{rec.timeline}</span>
                </div>
                <p className="text-sm mb-2">{rec.recommendation}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Impact:</span>
                    <p className="font-medium">{rec.impact}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cost:</span>
                    <p className="font-medium">{rec.cost}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Cost Optimization Opportunities
          </CardTitle>
          <CardDescription>Potential monthly savings through optimization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {costOptimizations.map((opt) => (
              <div key={opt.area} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{opt.area}</h4>
                  <Badge variant="default" className="text-green-600">
                    {opt.confidence}% confidence
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Current</span>
                    <p className="font-medium">${opt.current_cost.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Optimized</span>
                    <p className="font-medium">${opt.optimized_cost.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Savings</span>
                    <p className="font-medium text-green-600">${opt.savings.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictiveInsights;
