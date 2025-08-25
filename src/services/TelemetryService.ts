export interface TelemetryMetric {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export class TelemetryService {
  private static instance: TelemetryService;
  private metrics: TelemetryMetric[] = [];
  private maxRetries = 3;
  private retryDelay = 1000;

  static getInstance(): TelemetryService {
    if (!this.instance) {
      this.instance = new TelemetryService();
    }
    return this.instance;
  }

  startTimer(operation: string): () => void {
    const startTime = Date.now();
    
    return (success: boolean = true, error?: string, metadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      
      this.recordMetric({
        operation,
        duration,
        success,
        error,
        metadata: {
          ...metadata,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    };
  }

  // Make recordMetric public so it can be used externally
  recordMetric(metric: TelemetryMetric): void {
    this.metrics.push(metric);
    
    // Log performance warnings for slow operations
    if (metric.duration > 2000) {
      console.warn(`Slow operation detected: ${metric.operation} took ${metric.duration}ms`);
    }

    // Log edge function failures specifically
    if (!metric.success && metric.operation.includes('edge-function')) {
      console.error(`Edge function failure: ${metric.operation}`, {
        error: metric.error,
        duration: metric.duration,
        metadata: metric.metadata
      });
    }

    // Keep only recent metrics in memory (increased limit for better debugging)
    if (this.metrics.length > 2000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  // Enhanced method for recording edge function events
  recordEdgeFunctionEvent(
    functionName: string, 
    success: boolean, 
    error?: string, 
    metadata?: Record<string, any>,
    duration: number = 0
  ): void {
    this.recordMetric({
      operation: `edge-function:${functionName}`,
      duration,
      success,
      error,
      metadata: {
        ...metadata,
        functionName,
        retryable: this.isRetryableError(error),
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }

  // Add a simple method for recording events
  recordEvent(operation: string, success: boolean, error?: string, metadata?: Record<string, any>): void {
    this.recordMetric({
      operation,
      duration: 0,
      success,
      error,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  // Add a method for recording timing
  recordTiming(operation: string, duration: number, success: boolean = true, error?: string): void {
    this.recordMetric({
      operation,
      duration,
      success,
      error,
      timestamp: new Date().toISOString()
    });
  }

  getMetrics(operation?: string): TelemetryMetric[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation);
    }
    return [...this.metrics];
  }

  getAverageOperationTime(operation: string): number {
    const operationMetrics = this.getMetrics(operation);
    if (operationMetrics.length === 0) return 0;
    
    const totalTime = operationMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return totalTime / operationMetrics.length;
  }

  // Get failure rate for a specific operation
  getFailureRate(operation: string): number {
    const operationMetrics = this.getMetrics(operation);
    if (operationMetrics.length === 0) return 0;
    
    const failures = operationMetrics.filter(m => !m.success).length;
    return (failures / operationMetrics.length) * 100;
  }

  // Get recent edge function failures
  getRecentEdgeFunctionFailures(minutes: number = 30): TelemetryMetric[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.metrics.filter(m => 
      m.operation.includes('edge-function') && 
      !m.success && 
      new Date(m.timestamp) > cutoff
    );
  }

  // Check if an error is retryable
  private isRetryableError(error?: string): boolean {
    if (!error) return false;
    
    const retryablePatterns = [
      'network error',
      'timeout',
      'failed to fetch',
      'connection reset',
      'temporarily unavailable',
      'rate limited'
    ];
    
    return retryablePatterns.some(pattern => 
      error.toLowerCase().includes(pattern)
    );
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  // Get metrics summary for debugging
  getMetricsSummary(): {
    totalMetrics: number;
    recentFailures: number;
    averageResponseTime: number;
    mostFailedOperations: Array<{ operation: string; failures: number; rate: number }>;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentMetrics = this.metrics.filter(m => new Date(m.timestamp) > oneHourAgo);
    const failures = recentMetrics.filter(m => !m.success);
    
    // Calculate average response time
    const timedMetrics = recentMetrics.filter(m => m.duration > 0);
    const averageResponseTime = timedMetrics.length > 0 
      ? timedMetrics.reduce((sum, m) => sum + m.duration, 0) / timedMetrics.length 
      : 0;
    
    // Find most failed operations
    const operationFailures = new Map<string, number>();
    const operationCounts = new Map<string, number>();
    
    recentMetrics.forEach(m => {
      operationCounts.set(m.operation, (operationCounts.get(m.operation) || 0) + 1);
      if (!m.success) {
        operationFailures.set(m.operation, (operationFailures.get(m.operation) || 0) + 1);
      }
    });
    
    const mostFailedOperations = Array.from(operationFailures.entries())
      .map(([operation, failures]) => ({
        operation,
        failures,
        rate: ((failures / (operationCounts.get(operation) || 1)) * 100)
      }))
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 5);
    
    return {
      totalMetrics: this.metrics.length,
      recentFailures: failures.length,
      averageResponseTime: Math.round(averageResponseTime),
      mostFailedOperations
    };
  }
}

export const telemetryService = TelemetryService.getInstance();
