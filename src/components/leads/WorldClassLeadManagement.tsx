
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  RefreshCw,
  Download,
  Upload,
  Settings,
  Zap,
  Target,
  Clock,
  Award
} from 'lucide-react';
import { useEnhancedLeads, useLeadAnalytics } from '@/hooks/useEnhancedLeadManagement';
import { EnhancedLeadKanban } from './EnhancedLeadKanban';
import { LeadAnalyticsDashboard } from './LeadAnalyticsDashboard';
import { CreateLeadDialog } from './CreateLeadDialog';
import { LeadImportDialog } from './LeadImportDialog';
import { LeadSettingsDialog } from './LeadSettingsDialog';
import type { Lead } from '@/types/leads';

export const WorldClassLeadManagement: React.FC = () => {
  const { data: leads = [], isLoading, error } = useEnhancedLeads();
  const { data: analytics } = useLeadAnalytics();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Lead['status'] | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Lead['priority'] | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'analytics'>('kanban');
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [importLeadOpen, setImportLeadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Enhanced filtering with multiple criteria
  const filteredLeads = useMemo(() => {
    if (!leads?.length) return [];
    
    return leads.filter(lead => {
      const matchesSearch = lead.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (lead.organization_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (lead.notes?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
      const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesSource;
    });
  }, [leads, searchTerm, statusFilter, priorityFilter, sourceFilter]);

  // Real-time statistics with enhanced metrics
  const realTimeStats = useMemo(() => {
    if (!analytics) {
      return {
        total: 0,
        new: 0,
        qualified: 0,
        converted: 0,
        conversionRate: 0,
        averageScore: 0,
      };
    }

    return {
      total: analytics.totalLeads,
      new: analytics.statusCounts['new'] || 0,
      qualified: analytics.statusCounts['qualified'] || 0,
      converted: analytics.statusCounts['converted'] || 0,
      conversionRate: analytics.conversionRate,
      averageScore: analytics.averageScore,
    };
  }, [analytics]);

  const uniqueSources = useMemo(() => {
    const sources = new Set(leads.map(lead => lead.source).filter(Boolean));
    return Array.from(sources);
  }, [leads]);

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

  return (
    <div className="space-y-6 p-6">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Zap className="h-8 w-8 text-blue-600" />
            Lead Management
            <Badge variant="outline" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
              2025 Ready
            </Badge>
          </h1>
          <p className="text-gray-600 mt-2">World-class lead management with AI-powered insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportLeadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => setCreateLeadOpen(true)} className="bg-gradient-to-r from-blue-500 to-purple-500">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Enhanced Statistics Cards with Animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-700">Total Leads</p>
                <p className="text-3xl font-bold text-blue-900">{realTimeStats.total}</p>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-700">New Leads</p>
                <p className="text-3xl font-bold text-orange-900">{realTimeStats.new}</p>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-green-700">Qualified</p>
                <p className="text-3xl font-bold text-green-900">{realTimeStats.qualified}</p>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-emerald-700">Converted</p>
                <p className="text-3xl font-bold text-emerald-900">{realTimeStats.converted}</p>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-700">Conv. Rate</p>
                <p className="text-3xl font-bold text-purple-900">{realTimeStats.conversionRate}%</p>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-indigo-700">Avg Score</p>
                <p className="text-3xl font-bold text-indigo-900">{realTimeStats.averageScore}</p>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters and Search */}
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search leads by name, email, company, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as Lead['status'] | 'all')}
                className="px-3 py-2 border rounded-md bg-white"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="assigned">Assigned</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="rejected">Rejected</option>
              </select>

              <select 
                value={priorityFilter} 
                onChange={(e) => setPriorityFilter(e.target.value as Lead['priority'] | 'all')}
                className="px-3 py-2 border rounded-md bg-white"
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

              <select 
                value={sourceFilter} 
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-white"
              >
                <option value="all">All Sources</option>
                {uniqueSources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>

              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {filteredLeads.length !== leads.length && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredLeads.length} of {leads.length} leads
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Kanban Board
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Table View
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-6">
          <EnhancedLeadKanban 
            leads={filteredLeads}
            isLoading={isLoading}
            selectedLeads={selectedLeads}
            onSelectionChange={setSelectedLeads}
          />
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          {/* Table view will be implemented in next iteration */}
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Table View Coming Soon</h3>
              <p className="text-gray-600">Advanced table view with sorting, filtering, and bulk actions.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <LeadAnalyticsDashboard 
            open={true}
            onClose={() => setViewMode('kanban')}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateLeadDialog
        open={createLeadOpen}
        onClose={() => setCreateLeadOpen(false)}
      />

      <LeadImportDialog
        open={importLeadOpen}
        onClose={() => setImportLeadOpen(false)}
      />

      <LeadSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};
