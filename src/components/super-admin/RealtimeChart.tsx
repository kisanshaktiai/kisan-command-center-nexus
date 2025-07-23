
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface RealtimeChartProps {
  title: string;
  data: any[];
  dataKey: string;
  timeKey?: string;
  chartType?: 'line' | 'area';
  color?: string;
}

export const RealtimeChart: React.FC<RealtimeChartProps> = ({
  title,
  data,
  dataKey,
  timeKey = 'timestamp',
  chartType = 'line',
  color = 'hsl(var(--primary))'
}) => {
  // Process data for charts - group by hour for the last 24 hours
  const processedData = React.useMemo(() => {
    const hourlyData = new Map();
    const now = new Date();
    
    // Initialize last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = hour.toISOString().slice(0, 13) + ':00';
      hourlyData.set(key, { time: hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: 0 });
    }
    
    // Aggregate actual data
    data.forEach(item => {
      const timestamp = new Date(item[timeKey] || item.created_at);
      const hourKey = timestamp.toISOString().slice(0, 13) + ':00';
      
      if (hourlyData.has(hourKey)) {
        const existing = hourlyData.get(hourKey);
        existing.value += 1;
      }
    });
    
    return Array.from(hourlyData.values());
  }, [data, timeKey]);

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
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
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
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
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
                dot={{ fill: color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
