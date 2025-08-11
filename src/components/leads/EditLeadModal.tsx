
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLeadService } from '@/hooks/useLeadService';
import { useNotifications } from '@/hooks/useNotifications';
import type { Lead } from '@/types/leads';

interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess: () => void;
}

export const EditLeadModal: React.FC<EditLeadModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    contact_name: '',
    email: '',
    phone: '',
    organization_name: '',
    organization_type: '',
    status: 'new' as Lead['status'],
    priority: 'medium' as Lead['priority'],
    notes: '',
    qualification_score: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const { updateLead } = useLeadService();
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    if (lead) {
      setFormData({
        contact_name: lead.contact_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        organization_name: lead.organization_name || '',
        organization_type: lead.organization_type || '',
        status: lead.status,
        priority: lead.priority,
        notes: lead.notes || '',
        qualification_score: lead.qualification_score || 0
      });
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setIsLoading(true);
    try {
      const result = await updateLead(lead.id, formData);
      if (result) {
        showSuccess('Lead updated successfully');
        onSuccess();
      } else {
        showError('Failed to update lead');
      }
    } catch (error) {
      showError('Error updating lead');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead - {lead.contact_name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name *</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization_name">Organization Name</Label>
                <Input
                  id="organization_name"
                  value={formData.organization_name}
                  onChange={(e) => handleChange('organization_name', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Lead Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Lead Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange('status', value)}
                >
                  <SelectTrigger>
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
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => handleChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualification_score">Qualification Score</Label>
                <Input
                  id="qualification_score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.qualification_score}
                  onChange={(e) => handleChange('qualification_score', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Organization Type */}
          <div className="space-y-2">
            <Label htmlFor="organization_type">Organization Type</Label>
            <Input
              id="organization_type"
              value={formData.organization_type}
              onChange={(e) => handleChange('organization_type', e.target.value)}
              placeholder="e.g., Company, NGO, Cooperative"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              placeholder="Add any additional notes about this lead..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
