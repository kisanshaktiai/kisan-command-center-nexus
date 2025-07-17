
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Zap, 
  Target, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AIModelMonitoringProps {
  refreshInterval: number;
}

const AIModelMonitoring: React.FC<AIModelMonitoringProps> = ({ refreshInterval }) => {
  const [selectedModel, setSelectedModel] = useState('all');

  const { data: aiMetrics, isLoading } = useQuery({
    queryKey: ['ai-model-metrics', selectedModel],
    queryFn: async () => {
      let query = supabase.from('ai_model_metrics').select('*').order('timestamp', { ascending: false });
      
      if (selectedModel !== 'all') {
        query = query.eq('model_name', selectedModel);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: refreshInterval,
  });

  // Mock model data for demonstration
  const models = [
    {
      name: 'GPT-4 Turbo',
      version: 'v1.2.3',
      status: 'healthy',
      queries_24h: 12450,
      avg_response_time: 1250,
      accuracy: 94.2,
      resource_usage: 78,
      error_rate: 0.08,
      cost_per_query: 0.012
    },
    {
      name: 'Crop Vision Model',
      version: 'v2.1.0',
      status: 'healthy',
      queries_24h: 3200,
      avg_response_time: 850,
      accuracy: 96.8,
      resource_usage: 45,
      error_rate: 0.03,
      cost_per_query: 0.008
    },
    {
      name: 'Weather Prediction',
      version: 'v1.8.2',
      status: 'warning',
      queries_24h: 8750,
      avg_response_time: 2100,
      accuracy: 89.5,
      resource_usage: 92,
      error_rate: 0.15,
      cost_per_query: 0.015
    },
    {
      name: 'Market Analytics',
      version: 'v1.5.1',
      status: 'healthy',
      queries_24h: 1850,
      avg_response_time: 650,
      accuracy: 91.7,
      resource_usage: 32,
      error_rate: 0.05,
      cost_per_query: 0.006
    }
  ];

  const performanceData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    response_time: 800 + Math.random() * 600,
    accuracy: 90 + Math.random() * 8,
    queries: Math.floor(Math.random() * 500) + 100,
    errors: Math.floor(Math.random() * 10)
  }));

  const versionComparison = [
    { version: 'v1.2.3', accuracy: 94.2, response_time: 1250, queries: 12450 },
    { version: 'v1.2.2', accuracy: 93.8, response_time: 1320, queries: 11200 },
    { version: 'v1.2.1', accuracy: 93.1, response_time: 1380, queries: 10800 },
    { version: 'v1.2.0', accuracy: 92.5, response_time: 1450, queries: 9500 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-40 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Model Monitoring</h2>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            {models.map((model) => (
              <SelectItem key={model.name} value={model.name}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Model Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {models.map((model) => (
          <Card key={model.name}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{model.name}</CardTitle>
                {getStatusIcon(model.status)}
              </div>
              <CardDescription className="text-xs">{model.version}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Queries (24h)</span>
                  <span className="font-medium">{model.queries_24h.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Accuracy</span>
                  <span className="font-medium">{model.accuracy}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Response</span>
                  <span className="font-medium">{model.avg_response_time}ms</span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Resource Usage</span>
                    <span>{model.resource_usage}%</span>
                  </div>
                  <Progress value={model.resource_usage} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Response Time & Accuracy</CardTitle>
            <CardDescription>Performance metrics over the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="response_time" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                  name="Response Time (ms)" 
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2} 
                  name="Accuracy %" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Query Volume & Errors</CardTitle>
            <CardDescription>Query volume and error count by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="queries" fill="hsl(var(--primary))" name="Queries" />
                <Bar yAxisId="right" dataKey="errors" fill="hsl(var(--destructive))" name="Errors" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Version Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Version Performance Comparison
          </CardTitle>
          <CardDescription>Compare performance across different model versions</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={versionComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="version" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="accuracy" fill="hsl(var(--primary))" name="Accuracy %" />
              <Bar yAxisId="right" dataKey="response_time" fill="hsl(var(--secondary))" name="Response Time (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Model Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Detailed Model Statistics
          </CardTitle>
          <CardDescription>Comprehensive performance metrics for all models</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {models.map((model) => (
              <div key={model.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Brain className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">{model.name}</h4>
                      <p className="text-sm text-muted-foreground">{model.version}</p>
                    </div>
                  </div>
                  <Badge variant={getStatusBadge(model.status)}>
                    {model.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Queries (24h)</p>
                    <p className="font-medium">{model.queries_24h.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Response</p>
                    <p className="font-medium">{model.avg_response_time}ms</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Accuracy</p>
                    <p className="font-medium">{model.accuracy}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Error Rate</p>
                    <p className="font-medium">{model.error_rate}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Resource Usage</p>
                    <p className="font-medium">{model.resource_usage}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cost/Query</p>
                    <p className="font-medium">${model.cost_per_query}</p>
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

export default AIModelMonitoring;
