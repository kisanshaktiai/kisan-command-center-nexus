
import React, { useState, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Search,
  ChevronDown,
  ChevronRight,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { VirtualizedKanbanColumn } from './VirtualizedKanbanColumn';
import { CompactLeadCard } from './CompactLeadCard';
import { EnhancedLeadCard } from './EnhancedLeadCard';
import type { Lead } from '@/types/leads';

interface DraggableLeadKanbanProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: Lead['status']) => void;
  className?: string;
  isLoading?: boolean;
  selectedLeads?: string[];
  onSelectionChange?: (leadIds: string[]) => void;
  onRefresh?: () => void;
}

export const DraggableLeadKanban: React.FC<DraggableLeadKanbanProps> = ({
  leads,
  onStatusChange,
  className = '',
  isLoading = false,
  selectedLeads = [],
  onSelectionChange,
  onRefresh
}) => {
  const [compactMode, setCompactMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [columnSearches, setColumnSearches] = useState<Record<string, string>>({});
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({
    new: 50,
    assigned: 50,
    contacted: 50,
    qualified: 50,
    converted: 50,
    rejected: 50
  });

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

  // Group leads by status with search filtering
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
      const search = columnSearches[lead.status]?.toLowerCase() || '';
      const matchesSearch = !search || 
        lead.contact_name.toLowerCase().includes(search) ||
        lead.email.toLowerCase().includes(search) ||
        (lead.organization_name && lead.organization_name.toLowerCase().includes(search));
      
      if (matchesSearch) {
        grouped[lead.status].push(lead);
      }
    });

    return grouped;
  }, [leads, columnSearches]);

  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as Lead['status'];
    onStatusChange(draggableId, newStatus);
  }, [onStatusChange]);

  const toggleColumnCollapse = (status: string) => {
    const newCollapsed = new Set(collapsedColumns);
    if (newCollapsed.has(status)) {
      newCollapsed.delete(status);
    } else {
      newCollapsed.add(status);
    }
    setCollapsedColumns(newCollapsed);
  };

  const updateColumnSearch = (status: string, search: string) => {
    setColumnSearches(prev => ({ ...prev, [status]: search }));
  };

  const loadMoreInColumn = (status: string) => {
    setVisibleCounts(prev => ({
      ...prev,
      [status]: prev[status] + 50
    }));
  };

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 ${className}`}>
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
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="compact-mode"
              checked={compactMode}
              onCheckedChange={setCompactMode}
            />
            <Label htmlFor="compact-mode">Compact Mode (Performance)</Label>
          </div>
          <Badge variant="outline">
            Total: {leads.length} leads
          </Badge>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4 mr-2" />
          {showSettings ? 'Hide' : 'Show'} Settings
        </Button>
      </div>

      {/* Performance tip */}
      {leads.length > 500 && !compactMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            💡 Performance tip: Enable Compact Mode for better performance with {leads.length} leads
          </p>
        </div>
      )}

      {/* Drag and Drop Context */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {Object.entries(statusConfig).map(([status, config]) => {
            const statusLeads = leadsByStatus[status as Lead['status']];
            const IconComponent = config.icon;
            const isCollapsed = collapsedColumns.has(status);
            const visibleLeads = compactMode ? statusLeads : statusLeads.slice(0, visibleCounts[status]);
            const hasMore = !compactMode && statusLeads.length > visibleCounts[status];

            return (
              <Card key={status} className={`${config.borderColor} border-2 min-h-[400px] flex flex-col`}>
                <CardHeader className={`${config.bgColor} pb-4`}>
                  <CardTitle className={`${config.textColor}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleColumnCollapse(status)}
                          className="p-1"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
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
                    </div>
                  </CardTitle>
                  
                  {!isCollapsed && showSettings && (
                    <div className="mt-2">
                      <Input
                        placeholder={`Search in ${config.title.toLowerCase()}...`}
                        value={columnSearches[status] || ''}
                        onChange={(e) => updateColumnSearch(status, e.target.value)}
                        className="h-8"
                      />
                    </div>
                  )}
                </CardHeader>

                {!isCollapsed && (
                  <CardContent className="flex-1 p-4">
                    {compactMode ? (
                      <VirtualizedKanbanColumn
                        leads={statusLeads}
                        status={status as Lead['status']}
                        onStatusChange={onStatusChange}
                        selectedLeads={selectedLeads}
                        onSelectionChange={onSelectionChange}
                      />
                    ) : (
                      <Droppable droppableId={status}>
                        {(provided, snapshot) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`space-y-3 min-h-[200px] ${
                              snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''
                            }`}
                          >
                            {visibleLeads.map((lead, index) => (
                              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={snapshot.isDragging ? 'rotate-2 scale-105' : ''}
                                  >
                                    <EnhancedLeadCard
                                      lead={lead}
                                      onReassign={() => {}}
                                      onConvert={() => {}}
                                      isSelected={selectedLeads.includes(lead.id)}
                                      onSelect={() => onSelectionChange?.(
                                        selectedLeads.includes(lead.id)
                                          ? selectedLeads.filter(id => id !== lead.id)
                                          : [...selectedLeads, lead.id]
                                      )}
                                      expanded={false}
                                      onToggleExpanded={() => {}}
                                      onRefresh={onRefresh}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            
                            {hasMore && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadMoreInColumn(status)}
                                className="w-full"
                              >
                                Load More ({statusLeads.length - visibleCounts[status]} remaining)
                              </Button>
                            )}
                            
                            {statusLeads.length === 0 && (
                              <div className="text-center py-8 text-gray-500">
                                <div className="text-4xl mb-2">📋</div>
                                <p className="text-sm">No leads</p>
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};
