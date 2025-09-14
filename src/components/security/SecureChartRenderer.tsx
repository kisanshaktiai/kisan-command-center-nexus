
import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface SecureChartRendererProps {
  data: any;
  config: any;
  className?: string;
}

export const SecureChartRenderer: React.FC<SecureChartRendererProps> = ({
  data,
  config,
  className = ''
}) => {
  // Sanitize any HTML content in chart data
  const sanitizedData = useMemo(() => {
    if (!data) return data;
    
    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        return DOMPurify.sanitize(value, { 
          ALLOWED_TAGS: [], 
          ALLOWED_ATTR: [] 
        });
      }
      if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      }
      if (typeof value === 'object' && value !== null) {
        const sanitized: any = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[key] = sanitizeValue(val);
        }
        return sanitized;
      }
      return value;
    };

    return sanitizeValue(data);
  }, [data]);

  // Sanitize config labels and tooltips
  const sanitizedConfig = useMemo(() => {
    if (!config) return config;
    
    const sanitizeConfig = (obj: any): any => {
      if (typeof obj === 'string') {
        return DOMPurify.sanitize(obj, { 
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong'], 
          ALLOWED_ATTR: [] 
        });
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeConfig);
      }
      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeConfig(value);
        }
        return sanitized;
      }
      return obj;
    };

    return sanitizeConfig(config);
  }, [config]);

  if (!sanitizedData || !sanitizedConfig) {
    return <div className="text-muted-foreground">No chart data available</div>;
  }

  return (
    <div className={`secure-chart-container ${className}`}>
      {/* Chart implementation with sanitized data */}
      <div className="chart-wrapper">
        {/* Replace dangerouslySetInnerHTML with safe rendering */}
        <pre className="text-xs text-muted-foreground bg-muted p-2 rounded">
          {JSON.stringify({ data: sanitizedData, config: sanitizedConfig }, null, 2)}
        </pre>
      </div>
    </div>
  );
};
