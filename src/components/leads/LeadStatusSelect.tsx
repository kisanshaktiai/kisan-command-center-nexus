
import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUpdateLeadStatus } from '@/hooks/useLeadManagement';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import type { Lead } from '@/types/leads';

interface LeadStatusSelectProps {
  lead: Lead;
  onStatusChange?: (newStatus: Lead['status']) => void;
}

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  assigned: 'bg-yellow-100 text-yellow-800',
  contacted: 'bg-purple-100 text-purple-800',
  qualified: 'bg-green-100 text-green-800',
  converted: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
} as const;

const statusLabels = {
  new: 'New',
  assigned: 'Assigned',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  rejected: 'Rejected',
} as const;

export const LeadStatusSelect: React.FC<LeadStatusSelectProps> = ({
  lead,
  onStatusChange,
}) => {
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Lead['status'] | null>(null);
  const updateStatusMutation = useUpdateLeadStatus();

  const handleStatusChange = (newStatus: Lead['status']) => {
    // If changing from qualified to converted, show conversion dialog
    if (lead.status === 'qualified' && newStatus === 'converted') {
      setPendingStatus(newStatus);
      setShowConvertDialog(true);
      return;
    }

    // For other status changes, proceed normally
    updateStatusMutation.mutate(
      {
        leadId: lead.id,
        status: newStatus,
        notes: `Status changed from ${lead.status} to ${newStatus}`,
      },
      {
        onSuccess: () => {
          onStatusChange?.(newStatus);
        },
      }
    );
  };

  const handleConvertDialogClose = () => {
    setShowConvertDialog(false);
    setPendingStatus(null);
  };

  const handleConvertSuccess = () => {
    setShowConvertDialog(false);
    setPendingStatus(null);
    // The conversion dialog already handles the status update
    onStatusChange?.('converted');
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Select
          value={lead.status}
          onValueChange={handleStatusChange}
          disabled={updateStatusMutation.isPending}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Badge className={statusColors[lead.status]}>
          {statusLabels[lead.status]}
        </Badge>
      </div>

      <ConvertLeadDialog
        open={showConvertDialog}
        onClose={handleConvertDialogClose}
        lead={lead}
        onSuccess={handleConvertSuccess}
      />
    </>
  );
};
