
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
    <Card className="border-0 bg-gradient-to-br from-card/95 to-card/50 backdrop-blur-sm shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none rounded-lg" />
      <CardHeader className="relative">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          {chartType === 'area' ? (
            <AreaChart data={processedData}>
              <defs>
                <linearGradient id={`area-gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.1} />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 0.5 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 0.5 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                fill={`url(#area-gradient-${dataKey})`}
                strokeWidth={2}
              />
            </AreaChart>
          ) : (
            <LineChart data={processedData}>
              <defs>
                <linearGradient id={`line-gradient-${dataKey}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={color} stopOpacity={0.6}/>
                  <stop offset="100%" stopColor={color} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.1} />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 0.5 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 0.5 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={`url(#line-gradient-${dataKey})`}
                strokeWidth={2.5}
                dot={{ fill: color, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, stroke: color, strokeWidth: 2, fill: 'hsl(var(--card))' }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
