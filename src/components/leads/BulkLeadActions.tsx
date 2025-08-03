
import React from 'react';
import type { Lead } from '@/types/leads';

interface BulkLeadActionsProps {
  selectedLeads?: Lead[];
  onUpdate?: () => void;
}

export const BulkLeadActions: React.FC<BulkLeadActionsProps> = ({
  selectedLeads = [],
  onUpdate
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center p-8">
        <h3 className="text-lg font-semibold mb-2">
          Bulk Lead Actions
        </h3>
        <p className="text-gray-600">
          Bulk actions for {selectedLeads.length} selected leads
        </p>
      </div>
    </div>
  );
};
