
import { SystemMetric, FinancialMetric, ResourceMetric } from '@/data/types/metrics';

export class MetricsCalculations {
  static calculateSystemHealthScore(metrics: SystemMetric[]): number {
    if (!metrics.length) return 0;
    
    const totalScore = metrics.reduce((sum, metric) => {
      const score = metric.status === 'healthy' ? 100 : 
                   metric.status === 'warning' ? 70 : 30;
      return sum + score;
    }, 0);
    
    return Math.round(totalScore / metrics.length);
  }

  static calculateResourceUtilization(resources: ResourceMetric[]): {
    overall: number;
    critical: ResourceMetric[];
    warning: ResourceMetric[];
  } {
    const overall = resources.reduce((sum, resource) => sum + resource.usage_percentage, 0) / resources.length;
    
    return {
      overall: Math.round(overall),
      critical: resources.filter(r => r.status === 'critical'),
      warning: resources.filter(r => r.status === 'warning')
    };
  }

  static calculateFinancialTrends(metrics: FinancialMetric[]): {
    monthlyGrowth: number;
    totalRevenue: number;
    averageTransaction: number;
  } {
    const sortedMetrics = metrics.sort((a, b) => 
      new Date(a.period).getTime() - new Date(b.period).getTime()
    );
    
    const totalRevenue = metrics.reduce((sum, metric) => sum + metric.amount, 0);
    const averageTransaction = totalRevenue / metrics.length;
    
    // Calculate month-over-month growth
    let monthlyGrowth = 0;
    if (sortedMetrics.length >= 2) {
      const current = sortedMetrics[sortedMetrics.length - 1].amount;
      const previous = sortedMetrics[sortedMetrics.length - 2].amount;
      monthlyGrowth = ((current - previous) / previous) * 100;
    }
    
    return {
      monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
      totalRevenue,
      averageTransaction: Math.round(averageTransaction * 100) / 100
    };
  }

  static calculatePerformanceScore(
    systemHealth: number,
    resourceUtilization: number,
    errorRate: number
  ): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    recommendations: string[];
  } {
    const score = Math.round(
      (systemHealth * 0.4) + 
      ((100 - resourceUtilization) * 0.4) + 
      ((100 - errorRate) * 0.2)
    );
    
    const grade = score >= 90 ? 'A' : 
                 score >= 80 ? 'B' : 
                 score >= 70 ? 'C' : 
                 score >= 60 ? 'D' : 'F';
    
    const recommendations = [];
    if (systemHealth < 80) recommendations.push('Investigate system health issues');
    if (resourceUtilization > 80) recommendations.push('Scale resources or optimize usage');
    if (errorRate > 5) recommendations.push('Review and fix recurring errors');
    
    return { score, grade, recommendations };
  }
}
