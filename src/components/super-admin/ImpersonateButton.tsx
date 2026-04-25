import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  targetUserId: string;
  targetTenantId?: string;
  targetLabel?: string;
}

export function ImpersonateButton({ targetUserId, targetTenantId, targetLabel }: Props) {
  const { t } = useTranslation('admin');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [scope, setScope] = useState<'read_only' | 'full'>('read_only');
  const [submitting, setSubmitting] = useState(false);

  const start = async () => {
    if (reason.trim().length < 10) {
      toast.error('Reason must be at least 10 characters');
      return;
    }
    setSubmitting(true);
    try {
      // Record session row (RLS allows super-admins).
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('impersonation_sessions')
        .insert({
          super_admin_id: user!.id,
          target_user_id: targetUserId,
          target_tenant_id: targetTenantId || null,
          reason: reason.trim(),
          scope,
          user_agent: navigator.userAgent,
        } as any)
        .select()
        .single();
      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        admin_id: user!.id,
        action: 'impersonation_started',
        details: { session_id: (data as any).id, target_user_id: targetUserId, scope },
      } as any);

      // Store active session id locally so banner can show.
      sessionStorage.setItem('impersonation_session', JSON.stringify({
        id: (data as any).id,
        target_user_id: targetUserId,
        target_tenant_id: targetTenantId,
        scope,
        target_label: targetLabel,
      }));
      toast.success('Impersonation session started');
      setOpen(false);
      setReason('');
      // Trigger banner re-render
      window.dispatchEvent(new Event('impersonation-changed'));
    } catch (e: any) {
      toast.error(e.message || 'Failed to start');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserCog className="h-4 w-4 mr-2" />
          {t('impersonation.button')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('impersonation.title')}</DialogTitle>
        </DialogHeader>
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{t('impersonation.warning')}</AlertDescription>
        </Alert>
        <div className="space-y-3">
          <div>
            <Label htmlFor="imp-reason">{t('impersonation.reasonLabel')}</Label>
            <Textarea
              id="imp-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Investigating ticket #4521 — farmer reports missing NDVI data"
            />
          </div>
          <div>
            <Label>{t('impersonation.scopeLabel')}</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as any)} className="mt-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="read_only" id="scope-ro" />
                <Label htmlFor="scope-ro">{t('impersonation.readOnly')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="full" id="scope-full" />
                <Label htmlFor="scope-full">{t('impersonation.fullAccess')}</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={start} disabled={submitting}>
            {t('impersonation.start')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
