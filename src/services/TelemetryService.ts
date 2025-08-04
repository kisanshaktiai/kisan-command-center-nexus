
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
        metadata,
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

    // Keep only recent metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
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

  clearMetrics(): void {
    this.metrics = [];
  }
}

export const telemetryService = TelemetryService.getInstance();
