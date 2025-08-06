
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
              <p className="text-red-600 mb-4">Failed to load leads</p>
              <Button onClick={handleRefresh}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-500 mt-1">
            Manage and convert leads into tenants
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Leads</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Qualified</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.qualified}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Converted</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.converted}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversion Rate</CardDescription>
            <CardTitle className="text-2xl text-purple-600">{stats.conversionRate}%</CardTitle>
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
