
import React from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, Users, DollarSign, Database } from 'lucide-react';

interface ChartData {
  data: number[];
  labels: string[];
  growth_rate: number;
}

interface TenantAnalyticsChartProps {
  title: string;
  data: ChartData;
  type: 'line' | 'area' | 'bar';
  color?: string;
  icon?: React.ReactNode;
  unit?: string;
  showGrowthRate?: boolean;
}

export const TenantAnalyticsChart: React.FC<TenantAnalyticsChartProps> = ({
  title,
  data,
  type = 'line',
  color = '#3B82F6',
  icon,
  unit = '',
  showGrowthRate = true,
}) => {
  const chartData = data.labels.map((label, index) => ({
    name: new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: data.data[index] || 0,
  }));

  const totalValue = data.data.reduce((sum, val) => sum + val, 0);
  const isPositiveGrowth = data.growth_rate >= 0;

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value) => [`${value}${unit}`, title]}
              labelStyle={{ color: '#374151' }}
            />
            <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.3} />
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value) => [`${value}${unit}`, title]}
              labelStyle={{ color: '#374151' }}
            />
            <Bar dataKey="value" fill={color} />
          </BarChart>
        );
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value) => [`${value}${unit}`, title]}
              labelStyle={{ color: '#374151' }}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} />
          </LineChart>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {showGrowthRate && (
            <div className={`flex items-center gap-1 text-sm ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
              {isPositiveGrowth ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {Math.abs(data.growth_rate).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="text-2xl font-bold">
          {totalValue.toLocaleString()}{unit}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Pre-configured chart components
export const FarmersGrowthChart: React.FC<{ data: ChartData }> = ({ data }) => (
  <TenantAnalyticsChart
    title="Farmers Growth"
    data={data}
    type="area"
    color="#10B981"
    icon={<Users className="h-5 w-5 text-green-600" />}
    unit=" farmers"
  />
);

export const RevenueChart: React.FC<{ data: ChartData }> = ({ data }) => (
  <TenantAnalyticsChart
    title="Revenue Trends"
    data={data}
    type="line"
    color="#3B82F6"
    icon={<DollarSign className="h-5 w-5 text-blue-600" />}
    unit="$"
  />
);

export const ApiUsageChart: React.FC<{ data: ChartData }> = ({ data }) => (
  <TenantAnalyticsChart
    title="API Usage"
    data={data}
    type="bar"
    color="#8B5CF6"
    icon={<Activity className="h-5 w-5 text-purple-600" />}
    unit=" calls"
  />
);

export const StorageChart: React.FC<{ data: ChartData }> = ({ data }) => (
  <TenantAnalyticsChart
    title="Storage Usage"
    data={data}
    type="area"
    color="#F59E0B"
    icon={<Database className="h-5 w-5 text-yellow-600" />}
    unit=" GB"
  />
);
