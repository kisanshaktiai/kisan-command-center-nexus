
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Lead } from '@/types/leads';

interface LeadStatusSelectProps {
  currentStatus: Lead['status'];
  onStatusChange: (status: Lead['status']) => void;
  disabled?: boolean;
}

const statusOptions: { value: Lead['status']; label: string; variant: any }[] = [
  { value: 'new', label: 'New', variant: 'secondary' },
  { value: 'assigned', label: 'Assigned', variant: 'outline' },
  { value: 'contacted', label: 'Contacted', variant: 'default' },
  { value: 'qualified', label: 'Qualified', variant: 'default' },
  { value: 'converted', label: 'Converted', variant: 'default' },
  { value: 'rejected', label: 'Rejected', variant: 'destructive' },
];

export const LeadStatusSelect: React.FC<LeadStatusSelectProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
}) => {
  const currentStatusInfo = statusOptions.find(option => option.value === currentStatus);

  return (
    <Select
      value={currentStatus}
      onValueChange={onStatusChange}
      disabled={disabled}
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
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <Badge variant={option.variant} className="text-xs">
              {option.label}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
