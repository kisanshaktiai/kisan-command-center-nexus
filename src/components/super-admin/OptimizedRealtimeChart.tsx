
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface OptimizedRealtimeChartProps {
  title: string;
  data: any[];
  dataKey: string;
  timeKey?: string;
  chartType?: 'line' | 'area';
  color?: string;
  maxDataPoints?: number; // Limit data points for performance
}

export const OptimizedRealtimeChart: React.FC<OptimizedRealtimeChartProps> = ({
  title,
  data,
  dataKey,
  timeKey = 'timestamp',
  chartType = 'line',
  color = 'hsl(var(--primary))',
  maxDataPoints = 24 // Default to 24 hours
}) => {
  // Memoize processed data to prevent unnecessary recalculations
  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    console.log(`Processing chart data for ${title}, ${data.length} items`);
    
    const hourlyData = new Map();
    const now = new Date();
    
    // Initialize time slots (limited to maxDataPoints)
    for (let i = maxDataPoints - 1; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = hour.toISOString().slice(0, 13) + ':00';
      hourlyData.set(key, { 
        time: hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
        value: 0 
      });
    }
    
    // Only process recent data to avoid performance issues
    const recentData = data.slice(0, 1000); // Limit to last 1000 items
    
    // Aggregate data efficiently
    recentData.forEach(item => {
      const timestamp = new Date(item[timeKey] || item.created_at);
      const hourKey = timestamp.toISOString().slice(0, 13) + ':00';
      
      if (hourlyData.has(hourKey)) {
        const existing = hourlyData.get(hourKey);
        existing.value += 1;
      }
    });
    
    return Array.from(hourlyData.values()).slice(-maxDataPoints);
  }, [data, timeKey, title, maxDataPoints]);

  // Early return if no data
  if (processedData.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          {chartType === 'area' ? (
            <AreaChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))" 
                interval="preserveStartEnd"
              />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
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
                interval="preserveStartEnd"
              />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: color, strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
