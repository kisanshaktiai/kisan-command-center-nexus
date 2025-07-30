
export interface SystemMetric {
  id: string;
  tenant_id: string;
  metric_name: string;
  metric_type: string;
  value: number;
  unit: string;
  labels: Record<string, any>;
  timestamp: string;
  created_at: string;
  // Computed fields for compatibility
  name: string;
  status: 'healthy' | 'warning' | 'critical';
}

export interface FinancialMetric {
  id: string;
  tenant_id: string;
  metric_type: string;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  period_type: string;
  breakdown: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Computed fields for compatibility
  category: string;
  period: string;
}

export interface ResourceMetric {
  id: string;
  tenant_id: string;
  resource_type: string;
  current_usage: number;
  max_limit: number;
  usage_percentage: number;
  period_start: string;
  period_end: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Computed fields for compatibility
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
  timestamp: string;
}
