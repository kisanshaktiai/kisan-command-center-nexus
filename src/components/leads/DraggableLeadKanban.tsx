
import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  UserPlus, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  XCircle,
  Zap,
  Settings,
  BarChart3
} from 'lucide-react';
import { VirtualizedKanbanColumn } from './VirtualizedKanbanColumn';
import { LeadCard } from './EnhancedLeadCard';
import { LeadAssignmentDialog } from './LeadAssignmentDialog';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import { BulkLeadActions } from './BulkLeadActions';
import { useUpdateLeadStatus } from '@/hooks/useLeadManagement';
import type { Lead } from '@/types/leads';

interface DraggableLeadKanbanProps {
  leads: Lead[];
  isLoading: boolean;
  selectedLeads: string[];
  onSelectionChange: (leadIds: string[]) => void;
  onRefresh?: () => void;
}

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

export const DraggableLeadKanban: React.FC<DraggableLeadKanbanProps> = ({
  leads,
  isLoading,
  selectedLeads,
  onSelectionChange,
  onRefresh
}) => {
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedLeadForAction, setSelectedLeadForAction] = useState<string | null>(null);
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());
  const [compactMode, setCompactMode] = useState(false);
  const [searchableColumns, setSearchableColumns] = useState(true);

  const updateStatus = useUpdateLeadStatus();

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

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as Lead['status'];
    const leadId = draggableId;

    try {
      await updateStatus.mutateAsync({
        leadId,
        status: newStatus,
        notes: `Status updated to ${newStatus} via drag and drop`
      });
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update lead status:', error);
    }
  };

  const selectedLead = selectedLeadForAction ? leads.find(l => l.id === selectedLeadForAction) : null;

  if (isLoading) {
    return (
      <div className="flex gap-6 overflow-x-auto pb-6">
        {Object.keys(statusConfig).map((status) => (
          <Card key={status} className="w-80 h-96 flex-shrink-0">
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

  const shouldUseVirtualization = leads.length > 100;

  return (
    <>
      <div className="space-y-6">
        {/* Performance Controls */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Performance Settings</h3>
              <p className="text-sm text-gray-600">
                Optimize display for {leads.length.toLocaleString()} leads
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="compact-mode" 
                  checked={compactMode} 
                  onCheckedChange={setCompactMode}
                />
                <Label htmlFor="compact-mode" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Compact Mode
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="searchable-columns" 
                  checked={searchableColumns} 
                  onCheckedChange={setSearchableColumns}
                />
                <Label htmlFor="searchable-columns" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Column Search
                </Label>
              </div>
              <Badge variant="outline" className="flex items-center gap-2">
                <BarChart3 className="h-3 w-3" />
                {shouldUseVirtualization ? 'Virtualized' : 'Standard'}
              </Badge>
            </div>
          </div>
        </Card>

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
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 overflow-x-auto pb-6">
            {Object.entries(statusConfig).map(([status, config]) => {
              const statusLeads = leadsByStatus[status as Lead['status']];

              if (shouldUseVirtualization || compactMode) {
                return (
                  <VirtualizedKanbanColumn
                    key={status}
                    title={config.title}
                    icon={config.icon}
                    color={config.color}
                    bgColor={config.bgColor}
                    borderColor={config.borderColor}
                    textColor={config.textColor}
                    leads={statusLeads}
                    onReassign={handleReassignLead}
                    onConvert={handleConvertLead}
                    selectedLeads={selectedLeads}
                    onLeadSelection={handleLeadSelection}
                    expandedLeads={expandedLeads}
                    onToggleExpanded={handleToggleExpanded}
                    onRefresh={onRefresh}
                    compactMode={compactMode}
                    searchable={searchableColumns}
                  />
                );
              }

              return (
                <Droppable key={status} droppableId={status}>
                  {(provided, snapshot) => (
                    <Card 
                      className={`${config.borderColor} border-2 w-80 flex-shrink-0 flex flex-col min-h-[400px] ${
                        snapshot.isDraggingOver ? 'bg-gray-50' : ''
                      }`}
                    >
                      <CardHeader className={`${config.bgColor} pb-4`}>
                        <CardTitle className={`flex items-center justify-between ${config.textColor}`}>
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${config.color} text-white`}>
                              <config.icon className="h-4 w-4" />
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
                        <ScrollArea 
                          className="h-full"
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                        >
                          <div className="space-y-3">
                            {statusLeads.map((lead, index) => (
                              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`${snapshot.isDragging ? 'rotate-2 scale-105' : ''} transition-transform`}
                                  >
                                    <LeadCard
                                      lead={lead}
                                      onReassign={handleReassignLead}
                                      onConvert={handleConvertLead}
                                      isSelected={selectedLeads.includes(lead.id)}
                                      onSelect={() => handleLeadSelection(lead.id)}
                                      expanded={expandedLeads.has(lead.id)}
                                      onToggleExpanded={() => handleToggleExpanded(lead.id)}
                                      onRefresh={onRefresh}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            
                            {statusLeads.length === 0 && (
                              <div className="text-center py-8 text-gray-500">
                                <div className="text-4xl mb-2">📋</div>
                                <p className="text-sm">No leads in this status</p>
                                <p className="text-xs text-gray-400 mt-1">Drag leads here</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
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
