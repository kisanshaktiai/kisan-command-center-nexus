
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LeadSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const LeadSettingsDialog: React.FC<LeadSettingsDialogProps> = ({
  open,
  onClose
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lead Settings</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="text-gray-600">Lead settings functionality coming soon...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
