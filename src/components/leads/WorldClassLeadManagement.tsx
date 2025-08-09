
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Plus, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  Clock,
  BarChart3,
  Target,
  UserPlus,
  DollarSign
} from 'lucide-react';
import { EnhancedLeadKanban } from './EnhancedLeadKanban';
import { EnhancedLeadManagement } from './EnhancedLeadManagement';
import { LeadAnalyticsDashboard } from './LeadAnalyticsDashboard';
import { CreateLeadDialog } from './CreateLeadDialog';
import { useLeadManagement } from '@/hooks/useLeadManagement';

type ViewMode = 'kanban' | 'table' | 'analytics';

const WorldClassLeadManagement: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { leads, isLoading, refetch } = useLeadManagement({
    search: searchTerm,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!leads) return { total: 0, newLeads: 0, qualified: 0, converted: 0, conversionRate: 0 };
    
    const total = leads.length;
    const newLeads = leads.filter(lead => lead.status === 'new').length;
    const qualified = leads.filter(lead => lead.status === 'qualified').length;
    const converted = leads.filter(lead => lead.status === 'converted').length;
    const conversionRate = total > 0 ? (converted / total) * 100 : 0;

    return { total, newLeads, qualified, converted, conversionRate };
  }, [leads]);

  const handleCreateLead = () => {
    setIsCreateDialogOpen(true);
  };

  const handleCreateSuccess = () => {
    refetch();
    setIsCreateDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Lead Management</h1>
          <Badge variant="secondary" className="text-xs">
            World-Class CRM
          </Badge>
        </div>
        <Button onClick={handleCreateLead}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.newLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.qualified}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.converted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={currentView === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('kanban')}
          >
            Kanban
          </Button>
          <Button
            variant={currentView === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('table')}
          >
            Table
          </Button>
          <Button
            variant={currentView === 'analytics' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('analytics')}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Content based on view */}
      {currentView === 'kanban' && <EnhancedLeadKanban />}
      {currentView === 'table' && <EnhancedLeadManagement />}
      {currentView === 'analytics' && <LeadAnalyticsDashboard />}

      {/* Create Lead Dialog */}
      <CreateLeadDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default WorldClassLeadManagement;
