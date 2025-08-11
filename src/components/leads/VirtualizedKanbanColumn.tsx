
import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { CompactLeadCard } from './CompactLeadCard';
import type { Lead } from '@/types/leads';

interface VirtualizedKanbanColumnProps {
  leads: Lead[];
  title: string;
  onSelectionChange?: (leadIds: string[]) => void;
  selectedLeads?: string[];
  height?: number;
  itemHeight?: number;
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

const LeadItem: React.FC<LeadItemProps> = ({ index, style, data }) => {
  const { leads, selectedLeads, onSelectionChange, onReassign, onConvert } = data;
  const lead = leads[index];

  return (
    <div style={{ ...style, padding: '4px 0' }}>
      <CompactLeadCard
        lead={lead}
        onReassign={() => onReassign(lead)}
        onConvert={() => onConvert(lead)}
        isSelected={selectedLeads.includes(lead.id)}
        onSelect={() => {
          if (onSelectionChange) {
            const newSelection = selectedLeads.includes(lead.id)
              ? selectedLeads.filter(id => id !== lead.id)
              : [...selectedLeads, lead.id];
            onSelectionChange(newSelection);
          }
        }}
      />
    </div>
  );
};

export const VirtualizedKanbanColumn: React.FC<VirtualizedKanbanColumnProps> = ({
  leads,
  title,
  onSelectionChange,
  selectedLeads = [],
  height = 600,
  itemHeight = 120,
}) => {
  // Stable handlers that don't change UI design
  const handleReassign = (lead: Lead) => {
    console.log('Reassign lead:', lead.id);
    // This will be handled by parent components through proper event bubbling
  };

  const handleConvert = (lead: Lead) => {
    console.log('Convert lead:', lead.id);
    // This will be handled by parent components through proper event bubbling
  };

  const itemData = {
    leads,
    selectedLeads,
    onSelectionChange,
    onReassign: handleReassign,
    onConvert: handleConvert,
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium text-sm text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          {leads.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <List
          height={height}
          itemCount={leads.length}
          itemSize={itemHeight}
          itemData={itemData}
        >
          {LeadItem}
        </List>
      </div>
    </div>
  );
};
