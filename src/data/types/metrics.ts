

export interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
}

export interface FinancialMetric {
  id: string;
  category: string;
  amount: number;
  currency: string;
  period: string;
  change_percentage?: number;
}

export interface ResourceMetric {
  id: string;
  resource_type: 'cpu' | 'memory' | 'disk' | 'network';
  usage_percentage: number;
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
  timestamp: string;
}

export interface TenantMetric {
  tenant_id: string;
  metric_name: string;
  value: number;
  unit: string;
  timestamp: string;
}

