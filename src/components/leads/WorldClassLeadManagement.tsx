
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  Target, 
  Clock,
  Plus,
  Search,
  Filter,
  Download,
  Settings,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { useLeads } from '@/hooks/useLeadManagement';
import { LeadAnalyticsDashboard } from './LeadAnalyticsDashboard';
import { EnhancedLeadManagement } from './EnhancedLeadManagement';
import { BulkLeadActions } from './BulkLeadActions';
import { LeadImportDialog } from './LeadImportDialog';
import { LeadSettingsDialog } from './LeadSettingsDialog';
import type { Lead } from '@/types/leads';

export const WorldClassLeadManagement: React.FC = () => {
  const { data: leads = [], isLoading, error } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // Advanced filtering and search
  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    
    return leads.filter((lead: Lead) => 
      lead.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.owner_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.source?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const totalLeads = leads.length;
    const newLeads = leads.filter((l: Lead) => l.status === 'new').length;
    const qualifiedLeads = leads.filter((l: Lead) => l.status === 'qualified').length;
    const convertedLeads = leads.filter((l: Lead) => l.status === 'converted').length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    
    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLeads = leads.filter((l: Lead) => 
      new Date(l.created_at) >= sevenDaysAgo
    ).length;

    return {
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      conversionRate,
      recentLeads
    };
  }, [leads]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lead management...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading leads: {error.message}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
              <p className="text-gray-600 mt-1">
                Comprehensive lead tracking and conversion system
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowImportDialog(true)}
              >
                <Download className="h-4 w-4 mr-2" />
                Import Leads
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setShowSettingsDialog(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Lead
              </Button>
            </div>
          </div>

          {/* Search and Quick Actions */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads by name, email, company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            
            {selectedLeads.length > 0 && (
              <Badge variant="secondary" className="px-3 py-1">
                {selectedLeads.length} selected
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Leads</p>
                  <p className="text-2xl font-bold">{analytics.totalLeads}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">New Leads</p>
                  <p className="text-2xl font-bold text-blue-600">{analytics.newLeads}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Qualified</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.qualifiedLeads}</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Converted</p>
                  <p className="text-2xl font-bold text-emerald-600">{analytics.convertedLeads}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {analytics.conversionRate.toFixed(1)}%
                  </p>
                </div>
                <PieChart className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Recent (7d)</p>
                  <p className="text-2xl font-bold text-orange-600">{analytics.recentLeads}</p>
                </div>
                <Activity className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="leads">
              <Users className="h-4 w-4 mr-2" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="bulk-actions">
              <Settings className="h-4 w-4 mr-2" />
              Bulk Actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <LeadAnalyticsDashboard leads={filteredLeads} />
          </TabsContent>

          <TabsContent value="leads" className="space-y-4">
            <EnhancedLeadManagement 
              leads={filteredLeads}
              selectedLeads={selectedLeads}
              onSelectionChange={setSelectedLeads}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <LeadAnalyticsDashboard leads={filteredLeads} detailed />
          </TabsContent>

          <TabsContent value="bulk-actions" className="space-y-4">
            <BulkLeadActions 
              selectedLeads={selectedLeads.map(id => 
                leads.find((l: Lead) => l.id === id)
              ).filter(Boolean) as Lead[]}
              onUpdate={() => {
                setSelectedLeads([]);
                // Refresh leads
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <LeadImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />

      <LeadSettingsDialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
      />
    </div>
  );
};
