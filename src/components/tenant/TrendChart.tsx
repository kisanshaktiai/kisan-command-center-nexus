
import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface TrendChartProps {
  data: number[];
  label: string;
  color?: string;
  height?: number;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  label,
  color = '#10B981',
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
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 2, fill: color }}
            />
            <Tooltip
              labelStyle={{ display: 'none' }}
              contentStyle={{
                background: 'rgba(0, 0, 0, 0.8)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
              }}
              formatter={(value: any) => [value, label]}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
