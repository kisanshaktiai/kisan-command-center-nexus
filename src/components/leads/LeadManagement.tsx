
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  Plus, 
  UserCheck, 
  ArrowRight,
  ChevronDown,
  Users,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react';
import { CreateLeadDialog } from './CreateLeadDialog';
import { LeadAssignmentDialog } from './LeadAssignmentDialog';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import { LeadCard } from './LeadCard';
import { useLeads, useReassignLead, useConvertLeadToTenant } from '@/hooks/useLeadManagement';
import { useLeadService } from '@/hooks/useLeadService';
import type { Lead } from '@/types/leads';

interface LeadManagementProps {
  // Component props if needed
}

export const LeadManagement: React.FC<LeadManagementProps> = () => {
  const { data: leads = [], isLoading, error, refetch } = useLeads();
  const { getAdminUsers } = useLeadService();
  const reassignMutation = useReassignLead();
  const convertMutation = useConvertLeadToTenant();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = async () => {
    const users = await getAdminUsers();
    setAdminUsers(users);
  };

  // Filter leads based on search and filters
  const filteredLeads = leads.filter((lead: Lead) => {
    const matchesSearch = 
      lead.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.owner_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate summary statistics
  const stats = {
    total: leads.length,
    new: leads.filter((l: Lead) => l.status === 'new').length,
    qualified: leads.filter((l: Lead) => l.status === 'qualified').length,
    converted: leads.filter((l: Lead) => l.status === 'converted').length,
  };

  const handleReassign = (leadId: string) => {
    const lead = leads.find((l: Lead) => l.id === leadId);
    setSelectedLead(lead || null);
    setShowAssignDialog(true);
  };

  const handleConvert = (leadId: string) => {
    const lead = leads.find((l: Lead) => l.id === leadId);
    setSelectedLead(lead || null);
    setShowConvertDialog(true);
  };

  const handleReassignConfirm = async (adminId: string, reason?: string) => {
    if (!selectedLead) return;

    try {
      await reassignMutation.mutateAsync({
        leadId: selectedLead.id,
        newAdminId: adminId,
        reason,
      });
      setShowAssignDialog(false);
      setSelectedLead(null);
      refetch();
    } catch (error) {
      console.error('Failed to reassign lead:', error);
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  if (isLoading) {
    return <div className="p-4">Loading leads...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading leads: {error.message}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Lead Management</h1>
          <p className="text-gray-600">Manage and track your sales leads</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Lead
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold">{stats.total}</p>
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
                <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
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
                <p className="text-2xl font-bold text-green-600">{stats.qualified}</p>
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
                <p className="text-2xl font-bold text-emerald-600">{stats.converted}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
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
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {selectedLeads.length > 0 && (
          <Badge variant="secondary">
            {selectedLeads.length} selected
          </Badge>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <UserCheck className="h-4 w-4 mr-1" />
                  Bulk Assign
                </Button>
                <Button size="sm" variant="outline">
                  <Filter className="h-4 w-4 mr-1" />
                  Change Status
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No leads found matching your criteria.</p>
              <Button 
                className="mt-4" 
                onClick={() => setShowCreateDialog(true)}
              >
                Create Your First Lead
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredLeads.map((lead: Lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onReassign={handleReassign}
              onConvert={handleConvert}
              isSelected={selectedLeads.includes(lead.id)}
              onSelect={() => toggleLeadSelection(lead.id)}
            />
          ))
        )}
      </div>

      {/* Dialogs */}
      <CreateLeadDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      <LeadAssignmentDialog
        open={showAssignDialog}
        onClose={() => {
          setShowAssignDialog(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
        adminUsers={adminUsers}
        onAssign={handleReassignConfirm}
        isLoading={reassignMutation.isPending}
      />

      <ConvertLeadDialog
        open={showConvertDialog}
        onClose={() => {
          setShowConvertDialog(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
      />
    </div>
  );
};
