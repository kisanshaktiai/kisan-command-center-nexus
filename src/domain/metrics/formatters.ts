
export class MetricsFormatters {
  static formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  static formatPercentage(value: number, decimals = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  static formatNumber(value: number, unit?: string): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M${unit ? ` ${unit}` : ''}`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K${unit ? ` ${unit}` : ''}`;
    }
    return `${value}${unit ? ` ${unit}` : ''}`;
  }

  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  static getStatusColor(status: 'healthy' | 'warning' | 'critical' | 'normal'): string {
    switch (status) {
      case 'healthy':
      case 'normal':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  static formatChange(current: number, previous: number): {
    value: number;
    type: 'increase' | 'decrease';
    formatted: string;
  } | null {
    if (!previous || previous === 0) return null;
    
    const change = ((current - previous) / previous) * 100;
    const value = Math.abs(Math.round(change * 10) / 10);
    
    return {
      value,
      type: change >= 0 ? 'increase' : 'decrease',
      formatted: `${change >= 0 ? '+' : '-'}${value}%`
    };
  }
}
