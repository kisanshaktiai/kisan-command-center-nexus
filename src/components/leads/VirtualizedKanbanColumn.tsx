
import React, { memo } from 'react';
import { FixedSizeList } from 'react-window';
import { Draggable } from '@hello-pangea/dnd';
import { CompactLeadCard } from './CompactLeadCard';
import type { Lead } from '@/types/leads';

export interface VirtualizedKanbanColumnProps {
  title: string;
  leads: Lead[];
  selectedLeads: string[];
  onSelectionChange?: (leadIds: string[]) => void;
  onReassign: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
}

interface LeadItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    leads: Lead[];
    selectedLeads: string[];
    onSelectionChange?: (leadIds: string[]) => void;
    onReassign: (lead: Lead) => void;
    onConvert: (lead: Lead) => void;
  };
}

const LeadItem = memo<LeadItemProps>(({ index, style, data }) => {
  const { leads, selectedLeads, onSelectionChange, onReassign, onConvert } = data;
  const lead = leads[index];

  if (!lead) return null;

  const isSelected = selectedLeads.includes(lead.id);

  const handleSelect = () => {
    if (!onSelectionChange) return;
    
    if (isSelected) {
      onSelectionChange(selectedLeads.filter(id => id !== lead.id));
    } else {
      onSelectionChange([...selectedLeads, lead.id]);
    }
  };

  return (
    <div style={style} className="px-2 py-1">
      <Draggable draggableId={lead.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`transform transition-transform ${
              snapshot.isDragging ? 'rotate-2 scale-105' : ''
            }`}
          >
            <CompactLeadCard
              lead={lead}
              isSelected={isSelected}
              onSelect={handleSelect}
              onReassign={onReassign}
              onConvert={onConvert}
            />
          </div>
        )}
      </Draggable>
    </div>
  );
});

LeadItem.displayName = 'LeadItem';

export const VirtualizedKanbanColumn = memo<VirtualizedKanbanColumnProps>(({
  title,
  leads,
  selectedLeads,
  onSelectionChange,
  onReassign,
  onConvert
}) => {
  const itemData = {
    leads,
    selectedLeads,
    onSelectionChange,
    onReassign,
    onConvert
  };

  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No leads in {title.toLowerCase()}
      </div>
    );
  }

  return (
    <FixedSizeList
      children={LeadItem}
      height={400}
      width="100%"
      itemCount={leads.length}
      itemSize={120}
      itemData={itemData}
    />
  );
});

VirtualizedKanbanColumn.displayName = 'VirtualizedKanbanColumn';
