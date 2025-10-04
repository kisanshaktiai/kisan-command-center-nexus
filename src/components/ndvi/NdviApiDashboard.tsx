import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { LandNdviApiService, ApiCostSummary } from '@/services/api/LandNdviApiService';
import { Activity, DollarSign, TrendingUp, Clock } from 'lucide-react';

interface NdviApiDashboardProps {
  tenantId: string;
}

export const NdviApiDashboard = ({ tenantId }: NdviApiDashboardProps) => {
  const [costs, setCosts] = useState<ApiCostSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCosts = async () => {
      setLoading(true);
      const data = await LandNdviApiService.getTenantApiCosts(tenantId);
      setCosts(data);
      setLoading(false);
    };

    loadCosts();
  }, [tenantId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!costs) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">No API usage data available</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Copernicus API Usage (Last 30 Days)</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Total Calls</span>
          </div>
          <div className="text-2xl font-bold">{costs.total_calls.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {costs.successful_calls} successful, {costs.failed_calls} failed
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="text-sm font-medium">Total Cost</span>
          </div>
          <div className="text-2xl font-bold">${costs.total_cost_usd.toFixed(4)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {costs.total_processing_units.toFixed(2)} PU
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-info" />
            <span className="text-sm font-medium">Data Processed</span>
          </div>
          <div className="text-2xl font-bold">{costs.total_data_mb.toFixed(1)} MB</div>
          <div className="text-xs text-muted-foreground mt-1">
            ~{(costs.total_data_mb / costs.total_calls).toFixed(2)} MB/call
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">Avg Response</span>
          </div>
          <div className="text-2xl font-bold">{costs.avg_response_time_ms.toFixed(0)}ms</div>
          <div className="text-xs text-muted-foreground mt-1">
            Average time
          </div>
        </Card>
      </div>

      {costs.calls_by_type && Object.keys(costs.calls_by_type).length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Calls by API Type</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(costs.calls_by_type).map(([type, stats]) => (
              <Card key={type} className="p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">{type}</span>
                  <span className="text-xs text-muted-foreground">{stats.count} calls</span>
                </div>
                <div className="text-lg font-semibold mt-1">
                  ${stats.cost.toFixed(4)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
