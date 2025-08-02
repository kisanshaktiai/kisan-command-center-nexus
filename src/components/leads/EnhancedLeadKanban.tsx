
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
} from 'react-beautiful-dnd';
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
import { useOptimisticStatusUpdate } from '@/hooks/useEnhancedLeadManagement';
import { EnhancedLeadCard } from './EnhancedLeadCard';
import { StatusTransitionDialog } from './StatusTransitionDialog';
import type { Lead } from '@/types/leads';

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
  
  const updateStatus = useOptimisticStatusUpdate();

  // Group leads by status
  const leadsByStatus = statusColumns.reduce((acc, column) => {
    acc[column.id] = leads.filter(lead => lead.status === column.id);
    return acc;
  }, {} as Record<Lead['status'], Lead[]>);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    // If dropped in the same position, do nothing
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const newStatus = destination.droppableId as Lead['status'];
    const lead = leads.find(l => l.id === draggableId);
    
    if (!lead || lead.status === newStatus) return;

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
              <div className="h-6 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-32 bg-gray-100 rounded"></div>
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
              <Card key={column.id} className={`${column.color} border-2`}>
                <CardHeader className={`${column.headerColor} text-white pb-3 rounded-t-lg`}>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <IconComponent className="h-4 w-4" />
                    {column.title}
                    <Badge variant="secondary" className="ml-auto bg-white/20 text-white">
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
                      className={`p-3 min-h-[200px] transition-colors ${
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
                              >
                                <EnhancedLeadCard
                                  lead={lead}
                                  isSelected={selectedLeads.includes(lead.id)}
                                  onSelect={() => toggleLeadSelection(lead.id)}
                                  isDragging={snapshot.isDragging}
                                  onStatusUpdate={(leadId, status, notes) => 
                                    updateStatus.mutateAsync({ leadId, status, notes })
                                  }
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {columnLeads.length === 0 && (
                          <div className="text-center py-8 text-gray-400">
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
