
import React, { useState } from 'react';
import { LeadCard } from './LeadCard';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import type { Lead } from '@/types/leads';

interface LeadManagementTableProps {
  leads: Lead[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const LeadManagementTable: React.FC<LeadManagementTableProps> = ({
  leads,
  isLoading,
  onRefresh
}) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  const handleViewDetails = (lead: Lead) => {
    console.log('View details for lead:', lead.id);
    // This could open a detailed view modal or navigate to a details page
  };

  const handleEditLead = (lead: Lead) => {
    console.log('Edit lead:', lead.id);
    // This could open an edit modal or navigate to an edit page
  };

  const handleConvertLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowConvertDialog(true);
  };

  const handleConversionSuccess = () => {
    setShowConvertDialog(false);
    setSelectedLead(null);
    onRefresh();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-64 h-64 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
          <span className="text-gray-400 text-lg">No leads found</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No leads yet</h3>
        <p className="text-gray-500 mb-4">Get started by creating your first lead.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onViewDetails={handleViewDetails}
            onEdit={handleEditLead}
            onConvert={handleConvertLead}
            onRefresh={onRefresh}
          />
        ))}
      </div>

      <ConvertLeadDialog
        isOpen={showConvertDialog}
        onClose={() => setShowConvertDialog(false)}
        lead={selectedLead}
        onSuccess={handleConversionSuccess}
      />
    </>
  );
};
