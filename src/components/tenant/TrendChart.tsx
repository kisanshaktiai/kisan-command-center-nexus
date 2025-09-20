
import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';

interface TrendChartProps {
  data: number[];
  label: string;
  color?: string;
  height?: number;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  label,
  color = 'hsl(var(--primary))',
  height = 40,
}) => {
  const chartData = data.map((value, index) => ({
    index,
    value,
  }));

  const trend = data.length > 1 ? data[data.length - 1] - data[0] : 0;
  const isPositive = trend >= 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{trend > 0 ? trend.toFixed(1) : '0'}%
        </span>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`trend-gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#trend-gradient-${label})`}
              dot={false}
              activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
            />
            <Tooltip
              labelStyle={{ display: 'none' }}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                padding: '4px 8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: any) => [value, label]}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
