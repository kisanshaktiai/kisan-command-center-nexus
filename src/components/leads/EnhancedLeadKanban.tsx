
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult 
} from '@hello-pangea/dnd';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  UserCheck, 
  ArrowRight,
  MessageSquare,
  Target,
  Zap,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useUpdateLeadStatus } from '@/hooks/useLeadManagement';
import { LeadCard } from './LeadCard';
import { StatusTransitionDialog } from './StatusTransitionDialog';
import type { Lead } from '@/types/leads';

interface KanbanLeadCardProps {
  lead: Lead;
  isSelected: boolean;
  onSelect: () => void;
  isDragging: boolean;
  onStatusUpdate: (leadId: string, status: Lead['status'], notes?: string) => Promise<void>;
}

const KanbanLeadCard: React.FC<KanbanLeadCardProps> = ({
  lead,
  isSelected,
  onSelect,
  isDragging,
  onStatusUpdate,
}) => {
  const getPriorityColor = (priority: Lead['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500' : ''} ${isDragging ? 'shadow-xl' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
            />
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                {lead.contact_name}
              </CardTitle>
              <Badge 
                variant="outline" 
                className={`${getPriorityColor(lead.priority)} text-xs mt-1`}
              >
                {lead.priority}
              </Badge>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {new Date(lead.created_at).toLocaleDateString()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Mail className="h-3 w-3 text-gray-500" />
          <span className="truncate">{lead.email}</span>
        </div>
        
        {lead.phone && (
          <div className="flex items-center gap-2 text-xs">
            <Phone className="h-3 w-3 text-gray-500" />
            <span>{lead.phone}</span>
          </div>
        )}
        
        {lead.organization_name && (
          <div className="flex items-center gap-2 text-xs">
            <Building className="h-3 w-3 text-gray-500" />
            <span className="truncate">{lead.organization_name}</span>
          </div>
        )}

        {lead.qualification_score > 0 && (
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3 text-blue-500" />
            <span className="text-xs text-blue-600">Score: {lead.qualification_score}</span>
          </div>
        )}

        {lead.assigned_admin && (
          <div className="text-xs bg-blue-50 p-1 rounded">
            <UserCheck className="h-3 w-3 inline mr-1" />
            {lead.assigned_admin.full_name}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface EnhancedLeadKanbanProps {
  leads: Lead[];
  isLoading: boolean;
  selectedLeads: string[];
  onSelectionChange: (selectedLeads: string[]) => void;
}

const statusColumns = [
  { 
    id: 'new' as const, 
    title: 'New Leads', 
    color: 'bg-blue-50 border-blue-200',
    headerColor: 'bg-blue-500',
    icon: AlertTriangle,
    description: 'Fresh leads awaiting assignment'
  },
  { 
    id: 'assigned' as const, 
    title: 'Assigned', 
    color: 'bg-yellow-50 border-yellow-200',
    headerColor: 'bg-yellow-500',
    icon: UserCheck,
    description: 'Leads assigned to team members'
  },
  { 
    id: 'contacted' as const, 
    title: 'Contacted', 
    color: 'bg-orange-50 border-orange-200',
    headerColor: 'bg-orange-500',
    icon: MessageSquare,
    description: 'Initial contact has been made'
  },
  { 
    id: 'qualified' as const, 
    title: 'Qualified', 
    color: 'bg-green-50 border-green-200',
    headerColor: 'bg-green-500',
    icon: Target,
    description: 'Leads meeting qualification criteria'
  },
  { 
    id: 'converted' as const, 
    title: 'Converted', 
    color: 'bg-emerald-50 border-emerald-200',
    headerColor: 'bg-emerald-500',
    icon: Zap,
    description: 'Successfully converted to tenants'
  },
  { 
    id: 'rejected' as const, 
    title: 'Rejected', 
    color: 'bg-red-50 border-red-200',
    headerColor: 'bg-red-500',
    icon: Clock,
    description: 'Leads not suitable for conversion'
  },
];

export const EnhancedLeadKanban: React.FC<EnhancedLeadKanbanProps> = ({
  leads,
  isLoading,
  selectedLeads,
  onSelectionChange,
}) => {
  const [transitionDialog, setTransitionDialog] = useState<{
    open: boolean;
    lead?: Lead;
    newStatus?: Lead['status'];
  }>({ open: false });
  
  const updateStatus = useUpdateLeadStatus();

  // Group leads by status
  const leadsByStatus = statusColumns.reduce((acc, column) => {
    acc[column.id] = leads.filter(lead => lead.status === column.id);
    return acc;
  }, {} as Record<Lead['status'], Lead[]>);

  const handleDragEnd = (result: DropResult) => {
    console.log('Drag end result:', result);
    
    if (!result.destination) {
      console.log('No destination, drag cancelled');
      return;
    }

    const { source, destination, draggableId } = result;
    
    // If dropped in the same position, do nothing
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      console.log('Dropped in same position, no change needed');
      return;
    }

    const newStatus = destination.droppableId as Lead['status'];
    const lead = leads.find(l => l.id === draggableId);
    
    if (!lead) {
      console.error('Lead not found:', draggableId);
      return;
    }
    
    if (lead.status === newStatus) {
      console.log('Status unchanged');
      return;
    }

    console.log(`Moving lead ${lead.id} from ${lead.status} to ${newStatus}`);

    // Open confirmation dialog for status change
    setTransitionDialog({
      open: true,
      lead,
      newStatus,
    });
  };

  const handleStatusConfirm = async (notes: string) => {
    if (!transitionDialog.lead || !transitionDialog.newStatus) return;

    try {
      console.log('Confirming status change:', {
        leadId: transitionDialog.lead.id,
        newStatus: transitionDialog.newStatus,
        notes
      });

      await updateStatus.mutateAsync({
        leadId: transitionDialog.lead.id,
        status: transitionDialog.newStatus,
        notes,
      });
      
      setTransitionDialog({ open: false });
    } catch (error) {
      console.error('Status update failed:', error);
    }
  };

  const handleStatusUpdate = async (leadId: string, status: Lead['status'], notes?: string): Promise<void> => {
    try {
      console.log('Direct status update:', { leadId, status, notes });
      await updateStatus.mutateAsync({ leadId, status, notes });
    } catch (error) {
      console.error('Status update failed:', error);
      throw error;
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    const isSelected = selectedLeads.includes(leadId);
    if (isSelected) {
      onSelectionChange(selectedLeads.filter(id => id !== leadId));
    } else {
      onSelectionChange([...selectedLeads, leadId]);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {statusColumns.map((column) => (
          <Card key={column.id} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-6 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted rounded"></div>
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
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {statusColumns.map((column) => {
            const columnLeads = leadsByStatus[column.id] || [];
            const IconComponent = column.icon;
            
            return (
              <Card key={column.id} className={`${column.color} border-2 min-h-[600px]`}>
                <CardHeader className={`${column.headerColor} text-white pb-3 rounded-t-lg`}>
                  <CardTitle className="text-sm flex items-center gap-2 font-medium">
                    <IconComponent className="h-4 w-4" />
                    {column.title}
                    <Badge variant="secondary" className="ml-auto bg-white/20 text-white text-xs">
                      {columnLeads.length}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs opacity-90">{column.description}</p>
                </CardHeader>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <CardContent 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 min-h-[500px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-white/50' : ''
                      }`}
                    >
                      <div className="space-y-3">
                        {columnLeads.map((lead, index) => (
                          <Draggable 
                            key={lead.id} 
                            draggableId={lead.id} 
                            index={index}
                            isDragDisabled={lead.status === 'converted'}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`transform transition-all duration-200 ${
                                  snapshot.isDragging 
                                    ? 'rotate-2 scale-105 shadow-xl z-50' 
                                    : 'hover:scale-102 hover:shadow-md'
                                }`}
                                style={{
                                  ...provided.draggableProps.style,
                                  cursor: lead.status === 'converted' ? 'not-allowed' : 'grab',
                                }}
                              >
                                <KanbanLeadCard
                                  lead={lead}
                                  isSelected={selectedLeads.includes(lead.id)}
                                  onSelect={() => toggleLeadSelection(lead.id)}
                                  isDragging={snapshot.isDragging}
                                  onStatusUpdate={handleStatusUpdate}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {columnLeads.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <IconComponent className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No leads in {column.title.toLowerCase()}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Droppable>
              </Card>
            );
          })}
        </div>
      </DragDropContext>

      <StatusTransitionDialog
        open={transitionDialog.open}
        onClose={() => setTransitionDialog({ open: false })}
        lead={transitionDialog.lead}
        newStatus={transitionDialog.newStatus!}
        onConfirm={handleStatusConfirm}
        isLoading={updateStatus.isPending}
      />
    </>
  );
};
