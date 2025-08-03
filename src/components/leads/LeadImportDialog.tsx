
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LeadImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export const LeadImportDialog: React.FC<LeadImportDialogProps> = ({
  open,
  onClose
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Leads</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="text-gray-600">Lead import functionality coming soon...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
