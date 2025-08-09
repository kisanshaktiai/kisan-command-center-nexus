
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw } from 'lucide-react';
import { useLeads } from '@/hooks/useLeadManagement';
import { LeadManagementTable } from '@/components/leads/LeadManagementTable';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const LeadManagement: React.FC = () => {
  const { data: leads = [], isLoading, error, refetch } = useLeads();

  const handleRefresh = () => {
    refetch();
  };

  const stats = React.useMemo(() => {
    if (!leads.length) return { total: 0, qualified: 0, converted: 0, conversionRate: 0 };
    
    const total = leads.length;
    const qualified = leads.filter(lead => lead.status === 'qualified').length;
    const converted = leads.filter(lead => lead.status === 'converted').length;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

    return { total, qualified, converted, conversionRate };
  }, [leads]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive mb-4 text-sm font-medium">Failed to load leads</p>
              <Button onClick={handleRefresh} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Compact Header - matching project design */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage and convert leads into tenants
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Leads</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Qualified</CardDescription>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl text-info">{stats.qualified}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            </div>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Converted</CardDescription>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl text-[hsl(var(--success))]">{stats.converted}</CardTitle>
              <Badge variant="success" className="text-xs">
                Success
              </Badge>
            </div>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Conversion Rate</CardDescription>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl text-[hsl(var(--info))]">{stats.conversionRate}%</CardTitle>
              <Badge 
                variant={stats.conversionRate >= 20 ? "success" : stats.conversionRate >= 10 ? "warning" : "secondary"} 
                className="text-xs"
              >
                {stats.conversionRate >= 20 ? "Excellent" : stats.conversionRate >= 10 ? "Good" : "Needs Work"}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Lead Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
          <CardDescription>
            Track and manage all leads in your pipeline
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <LeadManagementTable
              leads={leads}
              isLoading={isLoading}
              onRefresh={handleRefresh}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadManagement;
