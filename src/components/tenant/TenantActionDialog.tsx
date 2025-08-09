
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tenant } from '@/types/tenant';
import { AlertTriangle, Pause, Play, Archive } from 'lucide-react';

export interface TenantActionDialogProps {
  tenant: Tenant | null;
  action: 'suspend' | 'reactivate' | 'archive' | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export const TenantActionDialog: React.FC<TenantActionDialogProps> = ({
  tenant,
  action,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}) => {
  const [reason, setReason] = useState('');
  const [archiveLocation, setArchiveLocation] = useState('');
  const [encryptionKeyId, setEncryptionKeyId] = useState('');

  const handleConfirm = async () => {
    if (!tenant || !action) return;

    const data: any = { tenantId: tenant.id };

    if (action === 'suspend') {
      data.reason = reason.trim() || undefined;
    } else if (action === 'archive') {
      data.archiveLocation = archiveLocation.trim();
      data.encryptionKeyId = encryptionKeyId.trim();
    }

    await onConfirm(data);
    handleClose();
  };

  const handleClose = () => {
    setReason('');
    setArchiveLocation('');
    setEncryptionKeyId('');
    onClose();
  };

  const getDialogConfig = () => {
    switch (action) {
      case 'suspend':
        return {
          title: 'Suspend Tenant',
          description: `Are you sure you want to suspend "${tenant?.name}"? This will disable access while preserving all data.`,
          icon: <Pause className="h-5 w-5 text-orange-500" />,
          confirmText: 'Suspend Tenant',
          confirmVariant: 'destructive' as const
        };
      case 'reactivate':
        return {
          title: 'Reactivate Tenant',
          description: `Are you sure you want to reactivate "${tenant?.name}"? This will restore full access.`,
          icon: <Play className="h-5 w-5 text-green-500" />,
          confirmText: 'Reactivate Tenant',
          confirmVariant: 'default' as const
        };
      case 'archive':
        return {
          title: 'Archive Tenant',
          description: `Are you sure you want to archive "${tenant?.name}"? This will move data to long-term storage.`,
          icon: <Archive className="h-5 w-5 text-blue-500" />,
          confirmText: 'Archive Tenant',
          confirmVariant: 'destructive' as const
        };
      default:
        return {
          title: '',
          description: '',
          icon: null,
          confirmText: '',
          confirmVariant: 'default' as const
        };
    }
  };

  const config = getDialogConfig();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon}
            {config.title}
          </DialogTitle>
          <DialogDescription className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {action === 'suspend' && (
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for suspension (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for suspending this tenant..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {action === 'archive' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="archiveLocation">Archive Location *</Label>
                <Textarea
                  id="archiveLocation"
                  placeholder="Enter archive storage location..."
                  value={archiveLocation}
                  onChange={(e) => setArchiveLocation(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="encryptionKeyId">Encryption Key ID *</Label>
                <Textarea
                  id="encryptionKeyId"
                  placeholder="Enter encryption key identifier..."
                  value={encryptionKeyId}
                  onChange={(e) => setEncryptionKeyId(e.target.value)}
                  required
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={
              isLoading ||
              (action === 'archive' && (!archiveLocation.trim() || !encryptionKeyId.trim()))
            }
          >
            {isLoading ? 'Processing...' : config.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
