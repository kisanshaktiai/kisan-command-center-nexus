import React, { useState, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, Plus, Users, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { VirtualizedKanbanColumn } from './VirtualizedKanbanColumn';
import type { Lead } from '@/types/leads';

interface DraggableLeadKanbanProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: Lead['status']) => void;
  className?: string;
}

export const DraggableLeadKanban: React.FC<DraggableLeadKanbanProps> = ({
  leads,
  onStatusChange,
  className = ""
}) => {
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSelectionChange = useCallback((leadIds: string[]) => {
    setSelectedLeads(leadIds);
  }, []);

  const handleReassign = useCallback((lead: Lead) => {
    console.log('Reassign lead:', lead.id);
    // TODO: Implement reassignment logic
  }, []);

  const handleConvert = useCallback((lead: Lead) => {
    console.log('Convert lead:', lead.id);
    // TODO: Implement conversion logic
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const searchLower = searchTerm.toLowerCase();
      return (
        lead.contact_name.toLowerCase().includes(searchLower) ||
        lead.email.toLowerCase().includes(searchLower) ||
        (lead.organization_name && lead.organization_name.toLowerCase().includes(searchLower))
      );
    });
  }, [leads, searchTerm]);

  const groupedLeads = useMemo(() => {
    const groups: Record<Lead['status'], Lead[]> = {
      new: [],
      assigned: [],
      contacted: [],
      qualified: [],
      converted: [],
      rejected: []
    };

    filteredLeads.forEach(lead => {
      groups[lead.status].push(lead);
    });

    return groups;
  }, [filteredLeads]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId as Lead['status'];
    onStatusChange(draggableId, newStatus);
  };

  const columns = [
    { 
      id: 'new' as const, 
      title: 'New Leads', 
      color: 'bg-blue-100 border-blue-200',
      icon: Plus,
      count: groupedLeads.new.length
    },
    { 
      id: 'assigned' as const, 
      title: 'Assigned', 
      color: 'bg-yellow-100 border-yellow-200',
      icon: Users,
      count: groupedLeads.assigned.length
    },
    { 
      id: 'contacted' as const, 
      title: 'Contacted', 
      color: 'bg-purple-100 border-purple-200',
      icon: Clock,
      count: groupedLeads.contacted.length
    },
    { 
      id: 'qualified' as const, 
      title: 'Qualified', 
      color: 'bg-orange-100 border-orange-200',
      icon: TrendingUp,
      count: groupedLeads.qualified.length
    },
    { 
      id: 'converted' as const, 
      title: 'Converted', 
      color: 'bg-green-100 border-green-200',
      icon: CheckCircle,
      count: groupedLeads.converted.length
    },
    { 
      id: 'rejected' as const, 
      title: 'Rejected', 
      color: 'bg-red-100 border-red-200',
      icon: CheckCircle,
      count: groupedLeads.rejected.length
    }
  ];

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Search and Filters */}
      <div className="flex items-center gap-4 p-4 border-b">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 p-4 h-full overflow-x-auto">
            {columns.map((column) => (
              <div key={column.id} className="flex-shrink-0 w-80">
                <Card className={`h-full ${column.color}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <column.icon className="h-4 w-4" />
                        <CardTitle className="text-sm font-medium">
                          {column.title}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {column.count}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 h-full">
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`h-full rounded-md transition-colors ${
                            snapshot.isDraggingOver ? 'bg-muted/50' : ''
                          }`}
                        >
                          <VirtualizedKanbanColumn
                            title={column.title}
                            leads={groupedLeads[column.id]}
                            selectedLeads={selectedLeads}
                            onSelectionChange={handleSelectionChange}
                            onReassign={handleReassign}
                            onConvert={handleConvert}
                          />
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};
