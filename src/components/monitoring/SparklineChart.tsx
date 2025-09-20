import React from 'react';

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  showDot?: boolean;
  className?: string;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  color = 'hsl(var(--primary))',
  height = 30,
  width = 100,
  showDot = true,
  className = ''
}) => {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const lastPoint = data[data.length - 1];
  const lastX = width;
  const lastY = height - ((lastPoint - min) / range) * height;

  return (
    <svg
      width={width}
      height={height}
      className={`inline-block ${className}`}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={`sparkline-gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      
      {/* Area under the line */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#sparkline-gradient-${color})`}
      />
      
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Last point dot */}
      {showDot && (
        <>
          <circle
            cx={lastX}
            cy={lastY}
            r="3"
            fill={color}
            className="animate-pulse"
          />
          <circle
            cx={lastX}
            cy={lastY}
            r="1.5"
            fill="white"
          />
        </>
      )}
    </svg>
  );
};