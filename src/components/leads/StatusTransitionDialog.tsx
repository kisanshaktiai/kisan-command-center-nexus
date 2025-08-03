
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { Lead } from '@/types/leads';

interface StatusTransitionDialogProps {
  open: boolean;
  onClose: () => void;
  lead?: Lead;
  newStatus: Lead['status'];
  onConfirm: (notes: string) => void;
  isLoading?: boolean;
}

const getStatusColor = (status: Lead['status']) => {
  switch (status) {
    case 'new': return 'bg-blue-500';
    case 'assigned': return 'bg-yellow-500';
    case 'contacted': return 'bg-orange-500';
    case 'qualified': return 'bg-green-500';
    case 'converted': return 'bg-emerald-500';
    case 'rejected': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getTransitionMessage = (oldStatus: Lead['status'], newStatus: Lead['status']) => {
  switch (newStatus) {
    case 'assigned':
      return 'This will assign the lead to an admin for follow-up.';
    case 'contacted':
      return 'Mark this when you have made initial contact with the lead.';
    case 'qualified':
      return 'Mark as qualified when the lead shows genuine interest and fits criteria.';
    case 'converted':
      return 'This will convert the lead to a tenant. This action cannot be undone.';
    case 'rejected':
      return 'Mark as rejected if the lead does not meet criteria or is not interested.';
    case 'new':
      return 'This will reset the lead back to new status for reassignment.';
    default:
      return 'This will update the lead status.';
  }
};

export const StatusTransitionDialog: React.FC<StatusTransitionDialogProps> = ({
  open,
  onClose,
  lead,
  newStatus,
  onConfirm,
  isLoading = false,
}) => {
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(notes.trim());
    setNotes('');
  };

  if (!lead) return null;

  const requiresNotes = newStatus === 'rejected' || newStatus === 'converted';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Status Change Confirmation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Badge className={`text-white ${getStatusColor(lead.status)}`}>
              {lead.status}
            </Badge>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <Badge className={`text-white ${getStatusColor(newStatus)}`}>
              {newStatus}
            </Badge>
          </div>

          <div className="text-center">
            <p className="font-medium">{lead.owner_name}</p>
            <p className="text-sm text-gray-500">{lead.owner_email}</p>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              {getTransitionMessage(lead.status, newStatus)}
            </p>
          </div>

          {requiresNotes && (
            <div className="p-3 bg-orange-50 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
              <p className="text-sm text-orange-700">
                {newStatus === 'rejected' 
                  ? 'Please provide a reason for rejection.'
                  : 'Please provide conversion details.'
                }
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="notes">
              {requiresNotes ? 'Reason *' : 'Notes (Optional)'}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                newStatus === 'rejected'
                  ? 'Why is this lead being rejected?'
                  : newStatus === 'converted'
                  ? 'Conversion details...'
                  : 'Additional notes about this status change...'
              }
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || (requiresNotes && !notes.trim())}
              className={newStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isLoading ? 'Updating...' : `Update to ${newStatus}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
