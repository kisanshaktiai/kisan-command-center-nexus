
import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lock } from 'lucide-react';
import { useValidNextStatuses } from '@/hooks/useValidNextStatuses';
import { StatusTransitionDialog } from './StatusTransitionDialog';
import type { Lead } from '@/types/leads';

interface EnhancedLeadStatusSelectProps {
  lead: Lead;
  onStatusChange: (leadId: string, status: Lead['status'], notes?: string) => Promise<void>;
  disabled?: boolean;
}

const statusOptions: { 
  value: Lead['status']; 
  label: string; 
  variant: any;
  description: string;
}[] = [
  { value: 'new', label: 'New', variant: 'secondary', description: 'Newly created lead' },
  { value: 'assigned', label: 'Assigned', variant: 'outline', description: 'Assigned to admin' },
  { value: 'contacted', label: 'Contacted', variant: 'default', description: 'Initial contact made' },
  { value: 'qualified', label: 'Qualified', variant: 'default', description: 'Meets criteria' },
  { value: 'converted', label: 'Converted', variant: 'default', description: 'Became a tenant' },
  { value: 'rejected', label: 'Rejected', variant: 'destructive', description: 'Not suitable' },
];

export const EnhancedLeadStatusSelect: React.FC<EnhancedLeadStatusSelectProps> = ({
  lead,
  onStatusChange,
  disabled = false,
}) => {
  const [pendingStatus, setPendingStatus] = useState<Lead['status'] | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { data: validNextStatuses = [], isLoading } = useValidNextStatuses(lead.status);
  
  const currentStatusInfo = statusOptions.find(option => option.value === lead.status);
  
  // Get available options (current status + valid next statuses)
  const availableStatuses = statusOptions.filter(option => 
    option.value === lead.status || validNextStatuses.includes(option.value)
  );

  const handleStatusSelect = (newStatus: Lead['status']) => {
    if (newStatus === lead.status) return;
    
    // Check if this is a valid transition
    if (!validNextStatuses.includes(newStatus)) {
      console.warn('Invalid status transition attempted:', lead.status, '->', newStatus);
      return;
    }
    
    setPendingStatus(newStatus);
  };

  const handleConfirmStatusChange = async (notes: string) => {
    if (!pendingStatus) return;
    
    setIsUpdating(true);
    try {
      await onStatusChange(lead.id, pendingStatus, notes);
      setPendingStatus(null);
    } catch (error) {
      console.error('Status change failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseDialog = () => {
    setPendingStatus(null);
  };

  if (isLoading) {
    return (
      <div className="w-32 h-8 bg-gray-200 animate-pulse rounded"></div>
    );
  }

  return (
    <>
      <Select
        value={lead.status}
        onValueChange={handleStatusSelect}
        disabled={disabled || isUpdating}
      >
        <SelectTrigger className="w-32">
          <SelectValue>
            {currentStatusInfo && (
              <Badge variant={currentStatusInfo.variant} className="text-xs">
                {currentStatusInfo.label}
              </Badge>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableStatuses.map((option) => {
            const isCurrentStatus = option.value === lead.status;
            const isDisabled = !isCurrentStatus && !validNextStatuses.includes(option.value);
            
            return (
              <SelectItem 
                key={option.value} 
                value={option.value}
                disabled={isDisabled}
                className="flex flex-col items-start p-3"
              >
                <div className="flex items-center justify-between w-full">
                  <Badge variant={option.variant} className="text-xs">
                    {option.label}
                  </Badge>
                  {isDisabled && <Lock className="h-3 w-3 text-gray-400" />}
                  {isCurrentStatus && <span className="text-xs text-blue-600">Current</span>}
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  {option.description}
                </span>
              </SelectItem>
            );
          })}
          
          {validNextStatuses.length === 0 && lead.status !== 'converted' && (
            <div className="p-3 text-xs text-gray-500 flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              No transitions available
            </div>
          )}
        </SelectContent>
      </Select>

      <StatusTransitionDialog
        open={!!pendingStatus}
        onClose={handleCloseDialog}
        lead={lead}
        newStatus={pendingStatus!}
        onConfirm={handleConfirmStatusChange}
        isLoading={isUpdating}
      />
    </>
  );
};
