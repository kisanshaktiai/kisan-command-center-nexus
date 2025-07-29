
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface OptimizedRealtimeChartProps {
  title: string;
  data: any[];
  dataKey: string;
  timeKey?: string;
  chartType?: 'line' | 'area';
  color?: string;
  maxDataPoints?: number;
}

export const OptimizedRealtimeChart: React.FC<OptimizedRealtimeChartProps> = ({
  title,
  data,
  dataKey,
  timeKey = 'timestamp',
  chartType = 'line',
  color = 'hsl(var(--primary))',
  maxDataPoints = 24 // Limit to 24 data points max
}) => {
  // Optimized data processing with limited data points
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    // Limit data points to prevent performance issues
    const limitedData = data.slice(0, maxDataPoints);
    
    const hourlyData = new Map();
    const now = new Date();
    
    // Initialize only the last N hours based on maxDataPoints
    for (let i = maxDataPoints - 1; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = hour.toISOString().slice(0, 13) + ':00';
      hourlyData.set(key, { 
        time: hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
        value: 0 
      });
    }
    
    // Aggregate limited data
    limitedData.forEach(item => {
      const timestamp = new Date(item[timeKey] || item.created_at);
      const hourKey = timestamp.toISOString().slice(0, 13) + ':00';
      
      if (hourlyData.has(hourKey)) {
        const existing = hourlyData.get(hourKey);
        existing.value += 1;
      }
    });
    
    return Array.from(hourlyData.values());
  }, [data, timeKey, maxDataPoints]);

  // Don't render if no data
  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-slate-500">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800">
          {title} ({processedData.length} points)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          {chartType === 'area' ? (
            <AreaChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                fill={color} 
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          ) : (
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                strokeWidth={2}
                dot={false} // Remove dots for better performance
                activeDot={{ r: 4, stroke: color, strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
