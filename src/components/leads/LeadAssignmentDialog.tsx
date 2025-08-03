
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { useReassignLead } from '@/hooks/useLeadManagement';
import { LeadService } from '@/services/LeadService';
import type { Lead } from '@/types/leads';

interface LeadAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  lead?: Lead | null;
  adminUsers?: any[];
  onAssign?: (adminId: string, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export const LeadAssignmentDialog: React.FC<LeadAssignmentDialogProps> = ({
  open,
  onClose,
  lead,
  adminUsers: propAdminUsers,
  onAssign: propOnAssign,
  isLoading: propIsLoading,
}) => {
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [reason, setReason] = useState('');

  const { data: adminUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const result = await LeadService.getAdminUsers();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data || [];
    },
    enabled: !propAdminUsers,
  });

  const reassignMutation = useReassignLead();

  const finalAdminUsers = propAdminUsers || adminUsers || [];
  const finalOnAssign = propOnAssign || ((adminId: string, reason?: string) => {
    if (!lead?.id) return Promise.resolve();
    
    return reassignMutation.mutateAsync({
      leadId: lead.id,
      newAdminId: adminId,
      reason: reason?.trim() || undefined,
    });
  });
  const finalIsLoading = propIsLoading ?? reassignMutation.isPending;

  const handleSubmit = async () => {
    if (!selectedAdmin) return;

    try {
      await finalOnAssign(selectedAdmin, reason.trim() || undefined);
      onClose();
      setSelectedAdmin('');
      setReason('');
    } catch (error) {
      console.error('Assignment failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Lead: {lead?.owner_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="admin">Assign to Admin</Label>
            <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
              <SelectTrigger>
                <SelectValue placeholder="Select an admin" />
              </SelectTrigger>
              <SelectContent>
                {finalAdminUsers.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.full_name || admin.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you reassigning this lead?"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedAdmin || finalIsLoading}
            >
              {finalIsLoading ? 'Assigning...' : 'Reassign Lead'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
