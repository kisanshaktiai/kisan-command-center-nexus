import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  tenantId: string;
  tenantName?: string;
}

interface FlagWithOverride {
  id: string;
  flag_name: string;
  description: string | null;
  is_enabled: boolean;
  tags: string[] | null;
  override?: { id: string; override_enabled: boolean; expires_at: string | null; override_reason: string | null };
}

async function fetchFlags(tenantId: string): Promise<FlagWithOverride[]> {
  const [flagsRes, ovRes] = await Promise.all([
    supabase
      .from('feature_flags')
      .select('id,flag_name,description,is_enabled,tags')
      .eq('flag_status', 'active')
      .order('flag_name'),
    supabase
      .from('tenant_feature_overrides')
      .select('id,flag_id,override_enabled,expires_at,override_reason')
      .eq('tenant_id', tenantId),
  ]);
  if (flagsRes.error) throw flagsRes.error;
  if (ovRes.error) throw ovRes.error;
  const ovMap = new Map((ovRes.data || []).map((o: any) => [o.flag_id, o]));
  return (flagsRes.data || []).map((f: any) => ({
    ...f,
    tags: (f.tags as string[]) || [],
    override: ovMap.get(f.id) as any,
  }));
}

export function TenantKillSwitchPanel({ tenantId, tenantName }: Props) {
  const { t } = useTranslation('admin');
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const { data: flags, isLoading } = useQuery({
    queryKey: ['kill-switch', tenantId],
    queryFn: () => fetchFlags(tenantId),
    enabled: !!tenantId,
  });

  const upsertOverride = useMutation({
    mutationFn: async ({ flagId, enabled }: { flagId: string; enabled: boolean }) => {
      if (reason.trim().length < 10) throw new Error('Reason must be at least 10 characters');
      const payload: any = {
        tenant_id: tenantId,
        flag_id: flagId,
        override_enabled: enabled,
        override_reason: reason.trim(),
      };
      if (expiresAt) payload.expires_at = new Date(expiresAt).toISOString();
      const { error } = await supabase.from('tenant_feature_overrides').upsert(payload, {
        onConflict: 'tenant_id,flag_id',
      });
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_id: user?.id,
        action: 'feature_kill_switch_toggled',
        details: { tenant_id: tenantId, flag_id: flagId, enabled, reason: reason.trim() },
      } as any);
    },
    onSuccess: () => {
      toast.success('Override saved');
      qc.invalidateQueries({ queryKey: ['kill-switch', tenantId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeOverride = useMutation({
    mutationFn: async (overrideId: string) => {
      const { error } = await supabase.from('tenant_feature_overrides').delete().eq('id', overrideId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Override removed');
      qc.invalidateQueries({ queryKey: ['kill-switch', tenantId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          {t('killSwitch.title')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {tenantName && <span className="font-medium">{tenantName} · </span>}
          {t('killSwitch.subtitle')}
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="ks-reason">{t('killSwitch.reasonLabel')}</Label>
            <Textarea
              id="ks-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Incident #1234 — disabling NDVI sync due to upstream outage"
            />
          </div>
          <div>
            <Label htmlFor="ks-expires">{t('killSwitch.expiresLabel')}</Label>
            <Input
              id="ks-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature flags</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-2">
              {(flags || []).map((f) => {
                const effective = f.override ? f.override.override_enabled : f.is_enabled;
                return (
                  <div key={f.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {f.flag_name}
                        {f.override && <Badge variant="secondary">override</Badge>}
                        {(f.tags || []).includes('non-essential') && (
                          <Badge variant="outline" className="text-xs">non-essential</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {t('killSwitch.globalDefault')}: {f.is_enabled ? 'ON' : 'OFF'} · {t('killSwitch.effective')}:{' '}
                        <span className={effective ? 'text-emerald-600' : 'text-rose-600'}>
                          {effective ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={effective}
                        onCheckedChange={(checked) => upsertOverride.mutate({ flagId: f.id, enabled: checked })}
                        disabled={upsertOverride.isPending}
                      />
                      {f.override && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeOverride.mutate(f.override!.id)}
                          disabled={removeOverride.isPending}
                        >
                          {t('killSwitch.remove')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {(flags?.length || 0) === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No active feature flags.</p>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">{t('killSwitch.auditNote')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
