import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Layout, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Activity,
  Users,
  DollarSign,
  Server
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CustomDashboard = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState(null);
  const [newDashboardName, setNewDashboardName] = useState('');
  const queryClient = useQueryClient();

  // Fetch user's dashboards
  const { data: dashboards, isLoading } = useQuery({
    queryKey: ['dashboard-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Available widget types
  const widgetTypes = [
    { id: 'metric_card', name: 'Metric Card', icon: BarChart3, description: 'Single metric display' },
    { id: 'line_chart', name: 'Line Chart', icon: TrendingUp, description: 'Time series data' },
    { id: 'bar_chart', name: 'Bar Chart', icon: BarChart3, description: 'Categorical data comparison' },
    { id: 'pie_chart', name: 'Pie Chart', icon: PieChart, description: 'Data distribution' },
    { id: 'alert_list', name: 'Alert List', icon: Activity, description: 'Current system alerts' },
    { id: 'usage_stats', name: 'Usage Stats', icon: Users, description: 'Platform usage metrics' },
    { id: 'revenue_card', name: 'Revenue Card', icon: DollarSign, description: 'Financial metrics' },
    { id: 'system_health', name: 'System Health', icon: Server, description: 'Infrastructure status' },
  ];

  // Mock dashboard data
  const mockDashboards = [
    {
      id: '1',
      dashboard_name: 'Executive Overview',
      is_default: true,
      widgets: [
        { id: 'w1', type: 'metric_card', title: 'Total Revenue', position: { x: 0, y: 0, w: 3, h: 2 } },
        { id: 'w2', type: 'line_chart', title: 'Revenue Trend', position: { x: 3, y: 0, w: 6, h: 4 } },
        { id: 'w3', type: 'metric_card', title: 'Active Users', position: { x: 9, y: 0, w: 3, h: 2 } },
        { id: 'w4', type: 'pie_chart', title: 'User Distribution', position: { x: 0, y: 2, w: 6, h: 4 } },
        { id: 'w5', type: 'alert_list', title: 'Recent Alerts', position: { x: 6, y: 4, w: 6, h: 3 } },
      ],
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      dashboard_name: 'Technical Metrics',
      is_default: false,
      widgets: [
        { id: 'w1', type: 'system_health', title: 'System Status', position: { x: 0, y: 0, w: 4, h: 3 } },
        { id: 'w2', type: 'line_chart', title: 'Response Times', position: { x: 4, y: 0, w: 8, h: 4 } },
        { id: 'w3', type: 'bar_chart', title: 'API Usage', position: { x: 0, y: 3, w: 6, h: 3 } },
        { id: 'w4', type: 'metric_card', title: 'Error Rate', position: { x: 6, y: 4, w: 3, h: 2 } },
        { id: 'w5', type: 'metric_card', title: 'Uptime', position: { x: 9, y: 4, w: 3, h: 2 } },
      ],
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  // Create dashboard mutation
  const createDashboard = useMutation({
    mutationFn: async (dashboardData) => {
      const { data, error } = await supabase
        .from('dashboard_configs')
        .insert([{
          dashboard_name: dashboardData.name,
          layout: { cols: 12, rows: 10 },
          widgets: [],
          is_default: false
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard-configs']);
      setIsCreating(false);
      setNewDashboardName('');
    },
  });

  // Delete dashboard mutation
  const deleteDashboard = useMutation({
    mutationFn: async (dashboardId) => {
      const { error } = await supabase
        .from('dashboard_configs')
        .delete()
        .eq('id', dashboardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard-configs']);
    },
  });

  const handleCreateDashboard = () => {
    if (newDashboardName.trim()) {
      createDashboard.mutate({ name: newDashboardName.trim() });
    }
  };

  const renderWidget = (widget) => {
    const WidgetIcon = widgetTypes.find(t => t.id === widget.type)?.icon || BarChart3;
    
    return (
      <Card key={widget.id} className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <WidgetIcon className="h-4 w-4" />
            {widget.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-20 text-muted-foreground">
            Widget content would render here
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDashboardPreview = (dashboard) => (
    <div className="grid grid-cols-12 gap-4 h-64 overflow-hidden">
      {dashboard.widgets?.slice(0, 6).map((widget) => (
        <div 
          key={widget.id} 
          className={`col-span-${Math.min(widget.position?.w || 4, 6)}`}
        >
          {renderWidget(widget)}
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-40 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const dashboardsToShow = dashboards?.length > 0 ? dashboards : mockDashboards;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Custom Dashboards</h2>
          <p className="text-muted-foreground">
            Create and manage personalized monitoring dashboards
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Dashboard
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Dashboard</DialogTitle>
              <DialogDescription>
                Create a custom dashboard with your preferred widgets and layout.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Dashboard Name</label>
                <Input
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  placeholder="Enter dashboard name"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateDashboard}
                disabled={!newDashboardName.trim() || createDashboard.isPending}
              >
                Create Dashboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Available Widget Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Available Widget Types
          </CardTitle>
          <CardDescription>Drag these widgets to build your custom dashboards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {widgetTypes.map((widget) => (
              <Card key={widget.id} className="cursor-move hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <widget.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <h4 className="font-medium text-sm">{widget.name}</h4>
                  <p className="text-xs text-muted-foreground">{widget.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Existing Dashboards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Dashboards</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {dashboardsToShow.map((dashboard) => (
            <Card key={dashboard.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{dashboard.dashboard_name}</CardTitle>
                    {dashboard.is_default && (
                      <Badge variant="default">Default</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteDashboard.mutate(dashboard.id)}
                      disabled={dashboard.is_default}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {dashboard.widgets?.length || 0} widgets • 
                  Created {new Date(dashboard.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderDashboardPreview(dashboard)}
                <div className="flex items-center justify-between mt-4">
                  <Button variant="outline" size="sm">
                    <Layout className="w-4 h-4 mr-2" />
                    Edit Layout
                  </Button>
                  <Button variant="outline" size="sm">
                    View Full Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Dashboard Builder Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Builder Guide</CardTitle>
          <CardDescription>How to create and customize your monitoring dashboards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h4 className="font-medium">Create Dashboard</h4>
                <p className="text-sm text-muted-foreground">Start by creating a new dashboard with a descriptive name.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <h4 className="font-medium">Add Widgets</h4>
                <p className="text-sm text-muted-foreground">Drag and drop widgets from the available types to your dashboard.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <h4 className="font-medium">Configure Layout</h4>
                <p className="text-sm text-muted-foreground">Resize and arrange widgets to create your ideal monitoring layout.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                4
              </div>
              <div>
                <h4 className="font-medium">Set as Default</h4>
                <p className="text-sm text-muted-foreground">Make your preferred dashboard the default view for quick access.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomDashboard;
