
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
  Award,
  Sparkles,
  Crown,
  Star
} from 'lucide-react';
import { useLeads } from '@/hooks/useLeadManagement';
import { useLeadAnalytics } from '@/hooks/useEnhancedLeadManagement';
import { EnhancedLeadKanban } from './EnhancedLeadKanban';
import { LeadAnalyticsDashboard } from './LeadAnalyticsDashboard';
import { CreateLeadDialog } from './CreateLeadDialog';
import { LeadImportDialog } from './LeadImportDialog';
import { LeadSettingsDialog } from './LeadSettingsDialog';
import type { Lead } from '@/types/leads';

export const WorldClassLeadManagement: React.FC = () => {
  const { data: leads = [], isLoading, error } = useLeads();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="space-y-8 p-8">
        {/* World-Class Header with Premium Design */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 rounded-3xl shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
          
          <div className="relative p-8 flex items-center justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full blur opacity-75 animate-pulse"></div>
                  <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
                    <Crown className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-5xl font-bold text-white flex items-center gap-4">
                    Lead Management
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black border-0 text-lg px-4 py-2">
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Powered
                    </Badge>
                  </h1>
                  <p className="text-blue-100 text-xl mt-2 font-medium">
                    World-class lead management with intelligent automation and real-time insights
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setImportLeadOpen(true)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Leads
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSettingsOpen(true)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button 
                onClick={() => setCreateLeadOpen(true)} 
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Lead
              </Button>
            </div>
          </div>
        </div>

        {/* Premium Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-700 uppercase tracking-wider">Total Leads</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">{realTimeStats.total.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-xs text-blue-600 font-medium">Live Data</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-700 uppercase tracking-wider">New Leads</p>
                  <p className="text-3xl font-bold text-orange-900 mt-1">{realTimeStats.new.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-xl shadow-lg">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-xs text-orange-600 font-medium">Real-time</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-700 uppercase tracking-wider">Qualified</p>
                  <p className="text-3xl font-bold text-green-900 mt-1">{realTimeStats.qualified.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-xs text-green-600 font-medium">Growing</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wider">Converted</p>
                  <p className="text-3xl font-bold text-emerald-900 mt-1">{realTimeStats.converted.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-xl shadow-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <CheckCircle className="h-4 w-4 text-emerald-500 mr-1" />
                <span className="text-xs text-emerald-600 font-medium">Success</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-purple-700 uppercase tracking-wider">Conv. Rate</p>
                  <p className="text-3xl font-bold text-purple-900 mt-1">{realTimeStats.conversionRate}%</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-lg">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-purple-500 mr-1" />
                <span className="text-xs text-purple-600 font-medium">Analytics</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-indigo-700 uppercase tracking-wider">AI Score</p>
                  <p className="text-3xl font-bold text-indigo-900 mt-1">{realTimeStats.averageScore}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                  <Award className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <Zap className="h-4 w-4 text-indigo-500 mr-1" />
                <span className="text-xs text-indigo-600 font-medium">AI Powered</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Premium Search and Filters */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search leads by name, email, company, or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 bg-white border-2 border-gray-200 focus:border-blue-500 rounded-xl text-lg"
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value as Lead['status'] | 'all')}
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white focus:border-blue-500 outline-none"
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
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white focus:border-blue-500 outline-none"
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
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white focus:border-blue-500 outline-none"
                >
                  <option value="all">All Sources</option>
                  {uniqueSources.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>

                <Button variant="outline" size="default" className="h-12 px-6 border-2 hover:bg-blue-50">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {filteredLeads.length !== leads.length && (
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-700 font-medium">
                  Showing {filteredLeads.length.toLocaleString()} of {leads.length.toLocaleString()} leads
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Premium View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm p-2 h-16 rounded-2xl shadow-xl">
            <TabsTrigger value="kanban" className="flex items-center gap-3 h-12 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              <Activity className="h-5 w-5" />
              <span className="font-semibold">Kanban Board</span>
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-3 h-12 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              <Users className="h-5 w-5" />
              <span className="font-semibold">Table View</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-3 h-12 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              <BarChart3 className="h-5 w-5" />
              <span className="font-semibold">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-8">
            <EnhancedLeadKanban 
              leads={filteredLeads}
              isLoading={isLoading}
              selectedLeads={selectedLeads}
              onSelectionChange={setSelectedLeads}
            />
          </TabsContent>

          <TabsContent value="table" className="mt-8">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
              <CardContent className="p-12 text-center">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-25"></div>
                  <Clock className="relative h-16 w-16 text-gray-400 mx-auto mb-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-800">Table View Coming Soon</h3>
                <p className="text-gray-600 text-lg">Advanced table view with sorting, filtering, and bulk actions.</p>
                <div className="mt-6">
                  <Badge variant="outline" className="px-4 py-2">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Next Release
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-8">
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
    </div>
  );
};
