
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useRealtimeOnboarding } from '@/hooks/useRealtimeOnboarding';
import { OnboardingAnalytics } from '@/components/onboarding/OnboardingAnalytics';
import { IntelligentWorkflowCreator } from '@/components/onboarding/IntelligentWorkflowCreator';
import { RealTimeWorkflowCard } from '@/components/onboarding/RealTimeWorkflowCard';
import { SmartStepManager } from '@/components/onboarding/SmartStepManager';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, Zap, TrendingUp, Users, Clock } from 'lucide-react';

export default function TenantOnboarding() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const { data: onboardingData, isLoading, error } = useRealtimeOnboarding();

  // Fetch available tenants for workflow creation
  const { data: availableTenants = [] } = useQuery({
    queryKey: ['available-tenants'],
    queryFn: async () => {
      const { data: workflowData } = await supabase
        .from('onboarding_workflows')
        .select('tenant_id');
      
      const existingTenantIds = workflowData?.map(w => w.tenant_id) || [];
      
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, subscription_plan')
        .not('id', 'in', existingTenantIds.length > 0 ? `(${existingTenantIds.join(',')})` : '()')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    }
  });

  const filteredWorkflows = onboardingData.workflows.filter(workflow => {
    const matchesSearch = workflow.tenants?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleWorkflowSelect = (workflow: any) => {
    setSelectedWorkflow(workflow);
  };

  const handleWorkflowCreated = () => {
    // Trigger refetch - the real-time subscription will handle the update
    console.log('Workflow created - real-time update will refresh data');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading onboarding data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <p className="text-red-600">Error loading onboarding data: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Intelligent Tenant Onboarding
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered, real-time tenant onboarding workflows with smart automation
          </p>
        </div>
        <div className="flex gap-3">
          <IntelligentWorkflowCreator 
            availableTenants={availableTenants}
            onWorkflowCreated={handleWorkflowCreated}
          />
          <Button variant="outline" className="bg-gradient-to-r from-green-50 to-blue-50">
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Real-time Analytics */}
      <OnboardingAnalytics analytics={onboardingData.analytics} />

      {/* Main Content */}
      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Active Workflows
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Completed
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Automation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Status</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          {/* Workflows Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredWorkflows.map((workflow) => (
              <RealTimeWorkflowCard
                key={workflow.id}
                workflow={workflow}
                onSelect={handleWorkflowSelect}
                isSelected={selectedWorkflow?.id === workflow.id}
              />
            ))}
          </div>

          {filteredWorkflows.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No workflows found matching your criteria</p>
              </div>
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}>
                Clear Filters
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-4">
            {onboardingData.workflows.filter(w => w.status === 'completed').map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{workflow.tenants?.name || 'Unknown Tenant'}</CardTitle>
                      <CardDescription>
                        Completed {workflow.completed_at ? new Date(workflow.completed_at).toLocaleDateString() : 'N/A'}
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-500">Completed</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Duration: {workflow.completed_at && workflow.started_at ? 
                      Math.ceil((new Date(workflow.completed_at).getTime() - new Date(workflow.started_at).getTime()) / (1000 * 60 * 60 * 24)) + ' days' : 'N/A'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Success Rate Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Charts and trends will be displayed here
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Completion Time Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Time analysis charts will be displayed here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Automation Rules
                </CardTitle>
                <CardDescription>
                  Configure intelligent automation for onboarding workflows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                    <h4 className="font-medium mb-2">Auto-progression Rules</h4>
                    <p className="text-sm text-muted-foreground">
                      Automatically move to next step when conditions are met
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50">
                    <h4 className="font-medium mb-2">Smart Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      AI-powered notifications based on progress and delays
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-pink-50">
                    <h4 className="font-medium mb-2">Predictive Analytics</h4>
                    <p className="text-sm text-muted-foreground">
                      Predict completion times and identify potential bottlenecks
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Workflow Details Modal */}
      {selectedWorkflow && (
        <Dialog open={!!selectedWorkflow} onOpenChange={() => setSelectedWorkflow(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                {selectedWorkflow.tenants?.name || 'Unknown Tenant'} - Smart Onboarding
              </DialogTitle>
              <DialogDescription>
                Intelligent workflow management with real-time progress tracking
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Workflow Overview */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedWorkflow.current_step}/{selectedWorkflow.total_steps}
                    </div>
                    <div className="text-sm text-muted-foreground">Steps Progress</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round((selectedWorkflow.current_step / selectedWorkflow.total_steps) * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Complete</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600 capitalize">
                      {selectedWorkflow.status}
                    </div>
                    <div className="text-sm text-muted-foreground">Status</div>
                  </CardContent>
                </Card>
              </div>

              {/* Smart Step Manager */}
              <SmartStepManager
                steps={onboardingData.steps[selectedWorkflow.id] || []}
                onStepUpdate={handleWorkflowCreated}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
