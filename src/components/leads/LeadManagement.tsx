
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Plus, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  Activity,
  RefreshCw
} from 'lucide-react';
import { useLeads } from '@/hooks/useLeadManagement';
import { useLeadProcessor } from '@/hooks/useLeadProcessor';
import { useConversionFunnel } from '@/hooks/useLeadAnalytics';
import { LeadCard } from './LeadCard';
import { LeadAssignmentDialog } from './LeadAssignmentDialog';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import { LeadAnalyticsDashboard } from './LeadAnalyticsDashboard';
import { CreateLeadDialog } from './CreateLeadDialog';
import { BulkLeadActions } from './BulkLeadActions';
import type { Lead } from '@/types/leads';

export const LeadManagement: React.FC = () => {
  const { data: leads = [], isLoading, error } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Lead['status'] | 'all'>('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [createLeadDialogOpen, setCreateLeadDialogOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>();

  const leadProcessor = useLeadProcessor();
  const { data: funnelData } = useConversionFunnel();

  // Memoized stats calculation to prevent unnecessary re-renders
  const realTimeStats = React.useMemo(() => {
    if (!leads?.length) {
      return {
        total: 0,
        new: 0,
        qualified: 0,
        converted: 0,
      };
    }

    return {
      total: leads.length,
      new: leads.filter(l => l.status === 'new').length,
      qualified: leads.filter(l => l.status === 'qualified').length,
      converted: leads.filter(l => l.status === 'converted').length,
    };
  }, [leads]);

  // Filter leads based on search term and status
  const filteredLeads = React.useMemo(() => {
    if (!leads?.length) return [];
    
    return leads.filter(lead => {
      const matchesSearch = lead.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (lead.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchTerm, statusFilter]);

  const handleReassign = useCallback((leadId: string) => {
    setSelectedLeadId(leadId);
    setAssignmentDialogOpen(true);
  }, []);

  const handleConvert = useCallback((leadId: string) => {
    setSelectedLeadId(leadId);
    setConvertDialogOpen(true);
  }, []);

  const handleBulkAutoAssign = useCallback(() => {
    selectedLeads.forEach(leadId => {
      leadProcessor.mutate({ action: 'auto_assign', leadId });
    });
    setSelectedLeads([]);
  }, [selectedLeads, leadProcessor]);

  const handleBulkScoreCalculation = useCallback(() => {
    selectedLeads.forEach(leadId => {
      leadProcessor.mutate({ action: 'calculate_score', leadId });
    });
    setSelectedLeads([]);
  }, [selectedLeads, leadProcessor]);

  const toggleLeadSelection = useCallback((leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  }, []);

  const selectedLead = React.useMemo(() => 
    leads.find(l => l.id === selectedLeadId), 
    [leads, selectedLeadId]
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load leads</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-100 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Header - matching project design */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-muted-foreground text-sm">Manage and track leads through the conversion pipeline</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAnalyticsOpen(true)} size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => setCreateLeadDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Real-time Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{realTimeStats.total}</p>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">New Leads</p>
                <p className="text-2xl font-bold text-gray-900">{realTimeStats.new}</p>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Qualified</p>
                <p className="text-2xl font-bold text-gray-900">{realTimeStats.qualified}</p>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Converted</p>
                <p className="text-2xl font-bold text-gray-900">{realTimeStats.converted}</p>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <BulkLeadActions
          selectedCount={selectedLeads.length}
          onAutoAssign={handleBulkAutoAssign}
          onCalculateScore={handleBulkScoreCalculation}
          onClearSelection={() => setSelectedLeads([])}
        />
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Leads
            <Badge variant="secondary" className="ml-auto">
              {filteredLeads.length} of {leads.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search leads by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'new', 'assigned', 'contacted', 'qualified', 'converted', 'rejected'] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Leads Grid */}
          {filteredLeads.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No leads found matching your criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onReassign={handleReassign}
                  onConvert={handleConvert}
                  isSelected={selectedLeads.includes(lead.id)}
                  onSelect={() => toggleLeadSelection(lead.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <LeadAssignmentDialog
        open={assignmentDialogOpen}
        onClose={() => {
          setAssignmentDialogOpen(false);
          setSelectedLeadId(undefined);
        }}
        leadId={selectedLeadId}
        leadName={selectedLead?.contact_name}
      />

      <ConvertLeadDialog
        open={convertDialogOpen}
        onClose={() => {
          setConvertDialogOpen(false);
          setSelectedLeadId(undefined);
        }}
        lead={selectedLead}
      />

      <CreateLeadDialog
        open={createLeadDialogOpen}
        onClose={() => setCreateLeadDialogOpen(false)}
      />

      <LeadAnalyticsDashboard
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
      />
    </div>
  );
};
