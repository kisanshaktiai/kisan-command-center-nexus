
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface LeadColumnManagerProps {
  open: boolean;
  onClose: () => void;
}

export const LeadColumnManager: React.FC<LeadColumnManagerProps> = ({
  open,
  onClose,
}) => {
  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'status', label: 'Status' },
    { id: 'priority', label: 'Priority' },
    { id: 'created', label: 'Created Date' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Columns</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {columns.map((column) => (
            <div key={column.id} className="flex items-center space-x-2">
              <Checkbox id={column.id} defaultChecked />
              <Label htmlFor={column.id}>{column.label}</Label>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
