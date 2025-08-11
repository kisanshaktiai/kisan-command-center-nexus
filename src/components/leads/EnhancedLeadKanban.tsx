
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  UserPlus, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  XCircle,
  Filter,
  Search,
  MoreVertical
} from 'lucide-react';
import { LeadCard } from './EnhancedLeadCard';
import { LeadAssignmentDialog } from './LeadAssignmentDialog';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import { BulkLeadActions } from './BulkLeadActions';
import { DraggableLeadKanban } from './DraggableLeadKanban';
import type { Lead } from '@/types/leads';

interface EnhancedLeadKanbanProps {
  leads: Lead[];
  isLoading: boolean;
  selectedLeads: string[];
  onSelectionChange: (leadIds: string[]) => void;
  onRefresh?: () => void;
  enableDragAndDrop?: boolean;
  onStatusChange: (leadId: string, newStatus: Lead['status']) => void;
}

export const EnhancedLeadKanban: React.FC<EnhancedLeadKanbanProps> = ({
  leads,
  isLoading,
  selectedLeads,
  onSelectionChange,
  onRefresh,
  enableDragAndDrop = true,
  onStatusChange
}) => {
  // If drag and drop is enabled and we have leads, use the enhanced version
  if (enableDragAndDrop) {
    return (
      <DraggableLeadKanban
        leads={leads}
        onStatusChange={onStatusChange}
        isLoading={isLoading}
        selectedLeads={selectedLeads}
        onSelectionChange={onSelectionChange}
        onRefresh={onRefresh}
      />
    );
  }

  // Fallback to original implementation for backward compatibility
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedLeadForAction, setSelectedLeadForAction] = useState<string | null>(null);
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());

  const statusConfig = {
    new: {
      title: 'New Leads',
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-900'
    },
    assigned: {
      title: 'Assigned',
      icon: UserPlus,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-900'
    },
    contacted: {
      title: 'Contacted',
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-900'
    },
    qualified: {
      title: 'Qualified',
      icon: TrendingUp,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-900'
    },
    converted: {
      title: 'Converted',
      icon: CheckCircle,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-900'
    },
    rejected: {
      title: 'Rejected',
      icon: XCircle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-900'
    }
  };

  // Group leads by status
  const leadsByStatus = useMemo(() => {
    const grouped: Record<Lead['status'], Lead[]> = {
      new: [],
      assigned: [],
      contacted: [],
      qualified: [],
      converted: [],
      rejected: []
    };

    leads.forEach(lead => {
      grouped[lead.status].push(lead);
    });

    return grouped;
  }, [leads]);

  const handleReassignLead = (leadId: string) => {
    setSelectedLeadForAction(leadId);
    setAssignmentDialogOpen(true);
  };

  const handleConvertLead = (leadId: string) => {
    setSelectedLeadForAction(leadId);
    setConvertDialogOpen(true);
  };

  const handleToggleExpanded = (leadId: string) => {
    const newExpanded = new Set(expandedLeads);
    if (newExpanded.has(leadId)) {
      newExpanded.delete(leadId);
    } else {
      newExpanded.add(leadId);
    }
    setExpandedLeads(newExpanded);
  };

  const handleLeadSelection = (leadId: string) => {
    if (selectedLeads.includes(leadId)) {
      onSelectionChange(selectedLeads.filter(id => id !== leadId));
    } else {
      onSelectionChange([...selectedLeads, leadId]);
    }
  };

  const selectedLead = selectedLeadForAction ? leads.find(l => l.id === selectedLeadForAction) : null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {Object.keys(statusConfig).map((status) => (
          <Card key={status} className="h-96">
            <CardHeader className="pb-3">
              <div className="animate-pulse bg-gray-200 h-6 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-gray-100 h-32 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Bulk Actions */}
        {selectedLeads.length > 0 && (
          <BulkLeadActions
            selectedCount={selectedLeads.length}
            onAutoAssign={() => {}}
            onCalculateScore={() => {}}
            onClearSelection={() => onSelectionChange([])}
          />
        )}

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {Object.entries(statusConfig).map(([status, config]) => {
            const statusLeads = leadsByStatus[status as Lead['status']];
            const IconComponent = config.icon;

            return (
              <Card key={status} className={`${config.borderColor} border-2 min-h-[400px] flex flex-col`}>
                <CardHeader className={`${config.bgColor} pb-4`}>
                  <CardTitle className={`flex items-center justify-between ${config.textColor}`}>
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${config.color} text-white`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{config.title}</div>
                        <div className="text-xs opacity-70">
                          {statusLeads.length} lead{statusLeads.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {statusLeads.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 p-4">
                  <ScrollArea className="h-full">
                    <div className="space-y-3">
                      {statusLeads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onReassign={handleReassignLead}
                          onConvert={handleConvertLead}
                          isSelected={selectedLeads.includes(lead.id)}
                          onSelect={() => handleLeadSelection(lead.id)}
                          expanded={expandedLeads.has(lead.id)}
                          onToggleExpanded={() => handleToggleExpanded(lead.id)}
                          onRefresh={onRefresh}
                        />
                      ))}
                      
                      {statusLeads.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-2">📋</div>
                          <p className="text-sm">No leads in this status</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Dialogs */}
      <LeadAssignmentDialog
        open={assignmentDialogOpen}
        onClose={() => {
          setAssignmentDialogOpen(false);
          setSelectedLeadForAction(null);
        }}
        leadId={selectedLeadForAction}
        leadName={selectedLead?.contact_name}
      />

      <ConvertLeadDialog
        isOpen={convertDialogOpen}
        onClose={() => {
          setConvertDialogOpen(false);
          setSelectedLeadForAction(null);
        }}
        lead={selectedLead}
        onSuccess={() => {
          setConvertDialogOpen(false);
          setSelectedLeadForAction(null);
          onRefresh?.();
        }}
      />
    </>
  );
};
