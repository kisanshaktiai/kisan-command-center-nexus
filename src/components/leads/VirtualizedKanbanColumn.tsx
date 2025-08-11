
import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { CompactLeadCard } from './CompactLeadCard';
import type { Lead } from '@/types/leads';

interface VirtualizedKanbanColumnProps {
  leads: Lead[];
  selectedLeads: string[];
  onSelectionChange?: (leadIds: string[]) => void;
}

interface LeadRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    leads: Lead[];
    selectedLeads: string[];
    onSelectionChange?: (leadIds: string[]) => void;
  };
}

const LeadRow: React.FC<LeadRowProps> = ({ index, style, data }) => {
  const { leads, selectedLeads, onSelectionChange } = data;
  const lead = leads[index];

  if (!lead) return null;

  return (
    <div style={{ ...style, padding: '4px 0' }}>
      <CompactLeadCard
        lead={lead}
        // Provide required handlers to satisfy the component's props
        onReassign={() => {}}
        onConvert={() => {}}
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
  selectedLeads,
  onSelectionChange
}) => {
  const itemData = useMemo(() => ({
    leads,
    selectedLeads,
    onSelectionChange
  }), [leads, selectedLeads, onSelectionChange]);

  const height = Math.min(leads.length * 120, 600); // Max 600px height

  if (leads.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-2">📋</div>
        <p className="text-sm">No leads</p>
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={leads.length}
      itemSize={120}
      itemData={itemData}
      width="100%"
    >
      {LeadRow}
    </List>
  );
};

