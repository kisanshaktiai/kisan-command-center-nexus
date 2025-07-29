// Consolidated monitoring and analytics types
export interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  status: 'healthy' | 'warning' | 'critical';
}

export interface EquipmentUtilization {
  equipment_id: string;
  equipment_name: string;
  utilization_rate: number;
  status: 'operational' | 'maintenance' | 'offline';
  last_maintenance: string;
  next_maintenance: string;
}

export interface WastageRecord {
  id: string;
  product_name: string;
  quantity_wasted: number;
  unit: string;
  reason: string;
  date_recorded: string;
  cost_impact: number;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'gauge';
  title: string;
  data: Record<string, unknown>;
  config: Record<string, unknown>;
  position: { x: number; y: number; width: number; height: number };
}

export interface DashboardData {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  created_at: string;
  updated_at?: string;
  is_public: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_active: boolean;
  notification_channels: string[];
}

export interface Alert {
  id: string;
  rule_id: string;
  message: string;
  severity: AlertRule['severity'];
  status: 'active' | 'acknowledged' | 'resolved';
  triggered_at: string;
  resolved_at?: string;
  metadata?: Record<string, unknown>;
}

export interface RealtimeMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_users: number;
  api_calls_per_minute: number;
  error_rate: number;
  response_time_ms: number;
}