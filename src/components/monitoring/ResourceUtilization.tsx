
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  Zap
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ResourceUtilizationProps {
  refreshInterval: number;
}

interface EquipmentUtilization {
  id: string;
  name: string;
  type: string;
  utilization_percentage: number;
  status: 'active' | 'maintenance' | 'idle';
  last_used: string;
  efficiency_score: number;
  tenant_id: string;
}

interface WastageRecord {
  id: string;
  resource_type: string;
  quantity_wasted: number;
  unit: string;
  cost_impact: number;
  cause: string;
  date: string;
  tenant_id: string;
}

const ResourceUtilization: React.FC<ResourceUtilizationProps> = ({ refreshInterval }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [resourceType, setResourceType] = useState('all');

  // Fetch equipment utilization data
  const { data: equipmentData, isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment-utilization', timeRange],
    queryFn: async (): Promise<EquipmentUtilization[]> => {
      const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('equipment_utilization')
        .select('*')
        .gte('last_used', startTime)
        .order('utilization_percentage', { ascending: false });

      if (error) {
        console.error('Failed to fetch equipment utilization:', error);
        return [];
      }

      return data || [];
    },
    refetchInterval: refreshInterval,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch wastage data
  const { data: wastageData, isLoading: wastageLoading } = useQuery({
    queryKey: ['resource-wastage', timeRange],
    queryFn: async (): Promise<WastageRecord[]> => {
      const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('resource_wastage')
        .select('*')
        .gte('date', startTime)
        .order('cost_impact', { ascending: false });

      if (error) {
        console.error('Failed to fetch wastage data:', error);
        return [];
      }

      return data || [];
    },
    refetchInterval: refreshInterval,
    retry: 3,
  });

  // Calculate resource summary
  const resourceSummary = React.useMemo(() => {
    if (!equipmentData || !wastageData) {
      return {
        total_equipment: 0,
        active_equipment: 0,
        avg_utilization: 0,
        total_wastage_cost: 0,
        efficiency_trend: 0
      };
    }

    const totalEquipment = equipmentData.length;
    const activeEquipment = equipmentData.filter(eq => eq.status === 'active').length;
    const avgUtilization = totalEquipment > 0 ? 
      equipmentData.reduce((sum, eq) => sum + eq.utilization_percentage, 0) / totalEquipment : 0;
    const totalWastageCost = wastageData.reduce((sum, w) => sum + w.cost_impact, 0);
    const avgEfficiency = totalEquipment > 0 ? 
      equipmentData.reduce((sum, eq) => sum + eq.efficiency_score, 0) / totalEquipment : 0;

    return {
      total_equipment: totalEquipment,
      active_equipment: activeEquipment,
      avg_utilization: avgUtilization,
      total_wastage_cost: totalWastageCost,
      efficiency_trend: avgEfficiency
    };
  }, [equipmentData, wastageData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'maintenance': return 'text-yellow-600';
      case 'idle': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'maintenance': return 'secondary';
      case 'idle': return 'destructive';
      default: return 'outline';
    }
  };

  const chartData = equipmentData?.slice(0, 10).map(eq => ({
    name: eq.name,
    utilization: eq.utilization_percentage,
    efficiency: eq.efficiency_score
  })) || [];

  const wastageByType = wastageData?.reduce((acc, item) => {
    const existing = acc.find(w => w.type === item.resource_type);
    if (existing) {
      existing.cost += item.cost_impact;
      existing.quantity += item.quantity_wasted;
    } else {
      acc.push({
        type: item.resource_type,
        cost: item.cost_impact,
        quantity: item.quantity_wasted
      });
    }
    return acc;
  }, [] as Array<{ type: string; cost: number; quantity: number }>) || [];

  const pieColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

  if (equipmentLoading || wastageLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-40 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Resource Utilization</h2>
        <div className="flex gap-4">
          <Select value={resourceType} onValueChange={setResourceType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select resource type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="vehicles">Vehicles</SelectItem>
              <SelectItem value="tools">Tools</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resourceSummary.total_equipment}</div>
            <p className="text-xs text-muted-foreground">
              {resourceSummary.active_equipment} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resourceSummary.avg_utilization.toFixed(1)}%</div>
            <Progress value={resourceSummary.avg_utilization} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wastage Cost</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{resourceSummary.total_wastage_cost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              This period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resourceSummary.efficiency_trend.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Overall efficiency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Equipment Utilization</CardTitle>
            <CardDescription>Top 10 equipment by utilization rate</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="utilization" fill="hsl(var(--primary))" name="Utilization %" />
                <Bar dataKey="efficiency" fill="hsl(var(--secondary))" name="Efficiency %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wastage by Resource Type</CardTitle>
            <CardDescription>Cost impact breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={wastageByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, cost }) => `${type}: ₹${cost.toLocaleString()}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="cost"
                >
                  {wastageByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Cost']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Equipment List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Equipment Status
          </CardTitle>
          <CardDescription>Current status and utilization of all equipment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {equipmentData?.map((equipment) => (
              <div key={equipment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className={`h-4 w-4 ${getStatusColor(equipment.status)}`} />
                  <div>
                    <h4 className="font-medium">{equipment.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {equipment.type} | Last used: {new Date(equipment.last_used).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">{equipment.utilization_percentage.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">
                      Efficiency: {equipment.efficiency_score.toFixed(1)}%
                    </div>
                  </div>
                  <div className="w-32">
                    <Progress value={equipment.utilization_percentage} className="h-2" />
                  </div>
                  <Badge variant={getStatusBadge(equipment.status)}>
                    {equipment.status}
                  </Badge>
                </div>
              </div>
            ))}
            
            {(!equipmentData || equipmentData.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No equipment data available for the selected time range.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResourceUtilization;
