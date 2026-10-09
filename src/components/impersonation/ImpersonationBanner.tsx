import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SessionInfo {
  id: string;
  target_user_id: string;
  target_tenant_id?: string;
  scope: 'read_only' | 'full';
  target_label?: string;
}

function readSession(): SessionInfo | null {
  const raw = sessionStorage.getItem('impersonation_session');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function ImpersonationBanner() {
  const { t } = useTranslation('admin');
  const [session, setSession] = useState<SessionInfo | null>(readSession());

  useEffect(() => {
    const handler = () => setSession(readSession());
    window.addEventListener('impersonation-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('impersonation-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  if (!session) return null;

  const end = async () => {
    try {
      await supabase
        .from('impersonation_sessions')
        .update({ ended_at: new Date().toISOString() } as any)
        .eq('id', session.id);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_id: user?.id,
        action: 'impersonation_ended',
        details: { session_id: session.id },
      } as any);
    } finally {
      sessionStorage.removeItem('impersonation_session');
      setSession(null);
      window.dispatchEvent(new Event('impersonation-changed'));
      toast.success('Impersonation ended');
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-rose-600 text-white px-4 py-2 flex items-center justify-between gap-3 shadow">
      <div className="flex items-center gap-2 text-sm">
        <ShieldAlert className="h-4 w-4" />
        <span>
          {t('impersonation.active', {
            user: session.target_label || session.target_user_id.slice(0, 8),
            tenant: session.target_tenant_id?.slice(0, 8) || '—',
          })}{' '}
          · scope: <strong>{session.scope}</strong>
        </span>
      </div>
      <Button size="sm" variant="secondary" onClick={end}>
        {t('impersonation.endButton')}
      </Button>
    </div>
  );
}
