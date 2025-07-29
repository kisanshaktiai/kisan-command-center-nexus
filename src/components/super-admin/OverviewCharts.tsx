import React from 'react';
import { RealtimeChart } from '@/components/super-admin/RealtimeChart';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';

export const OverviewCharts: React.FC = () => {
  const realtimeData = useRealtimeSubscriptions();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <RealtimeChart
        title="API Usage (Last 24 Hours)"
        data={realtimeData.apiUsage}
        dataKey="endpoint"
        chartType="area"
        color="hsl(var(--primary))"
      />
      
      <RealtimeChart
        title="New Tenants Created"
        data={realtimeData.tenants}
        dataKey="name"
        chartType="line"
        color="hsl(142, 76%, 36%)"
      />
    </div>
  );
};