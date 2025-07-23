
export type TenantViewMode = 'small-cards' | 'large-cards' | 'list' | 'analytics';
export type ViewDensity = 'compact' | 'comfortable' | 'spacious';

export interface TenantViewPreferences {
  mode: TenantViewMode;
  density: ViewDensity;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  selectedColumns?: string[];
}

export interface TenantMetrics {
  usageMetrics: {
    farmers: { current: number; limit: number; percentage: number };
    dealers: { current: number; limit: number; percentage: number };
    products: { current: number; limit: number; percentage: number };
    storage: { current: number; limit: number; percentage: number };
    apiCalls: { current: number; limit: number; percentage: number };
  };
  growthTrends: {
    farmers: number[];
    revenue: number[];
    apiUsage: number[];
  };
  healthScore: number;
  lastActivityDate: string;
}

export interface TenantBillingData {
  mrr: number;
  totalRevenue: number;
  nextBillingDate: string;
  paymentStatus: 'current' | 'overdue' | 'failed';
  outstandingBalance: number;
}
