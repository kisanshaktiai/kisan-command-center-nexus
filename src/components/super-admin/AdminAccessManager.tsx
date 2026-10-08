import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Mail, RefreshCw, Send, Shield, UserPlus, XCircle, CheckCircle2, Clock } from 'lucide-react';

type Role = 'admin' | 'platform_admin' | 'super_admin';
const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'super_admin', label: 'Super Admin', desc: 'Full control: tenants, billing, admins, AI, governance' },
  { value: 'platform_admin', label: 'Platform Admin', desc: 'Portal access; server actions are super-admin only today' },
  { value: 'admin', label: 'Admin', desc: 'Portal access; server actions are super-admin only today' },
];
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

interface AdminRow {
  id: string; email: string; full_name: string | null; role: Role; is_active: boolean;
  created_at: string; email_confirmed_at: string | null; last_sign_in_at: string | null; auth_missing: boolean;
}
interface InviteRow {
  id: string; email: string; role: Role; status: string; expires_at: string; accepted_at: string | null; created_at: string;
}

async function call<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('user-invitations', { body });
  if (error) {
    let msg = error.message;
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : '—');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const AdminAccessManager: React.FC = () => {
  const qc = useQueryClient();
  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ['admin-directory'],
    queryFn: () => call<{ admins: AdminRow[]; invites: InviteRow[]; caller_id: string }>({ action: 'admin_list' }),
  });
  const done = (msg: string) => { toast.success(msg); qc.invalidateQueries({ queryKey: ['admin-directory'] }); };
  const fail = (e: Error) => toast.error(e.message);

  const setRole = useMutation({ mutationFn: (v: { adminId: string; role: Role }) => call({ action: 'admin_set_role', ...v }), onSuccess: () => done('Role updated'), onError: fail });
  const setActive = useMutation({ mutationFn: (v: { adminId: string; active: boolean }) => call({ action: 'admin_set_active', ...v }), onSuccess: (_d, v) => done(v.active ? 'Access restored' : 'Access revoked and sessions signed out'), onError: fail });
  const cancel = useMutation({ mutationFn: (inviteId: string) => call({ action: 'admin_cancel', inviteId }), onSuccess: () => done('Invitation cancelled'), onError: fail });
  const resend = useMutation({ mutationFn: (inviteId: string) => call({ action: 'admin_resend', inviteId }), onSuccess: () => done('New invitation email sent'), onError: fail });

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRoleSel] = useState<Role>('admin');
  const send = useMutation({
    mutationFn: async () => {
      const normalized = email.trim().toLowerCase();
      const v = await call<{ isValid: boolean; issues: string[] }>({ action: 'validate', email: normalized, invitationType: 'admin', role });
      if (!v.isValid) throw new Error(v.issues.join('. '));
      return call({ action: 'send', invitation_type: 'admin', email: normalized, role, organizationName: 'KisanShaktiAI' });
    },
    onSuccess: () => { done('Invitation email sent'); setOpen(false); setEmail(''); setRoleSel('admin'); },
    onError: fail,
  });

  const admins = data?.admins ?? [];
  const invites = data?.invites ?? [];
  const pending = invites.filter((i) => i.status === 'pending');
  const stats = useMemo(() => ({
    active: admins.filter((a) => a.is_active).length,
    supers: admins.filter((a) => a.is_active && a.role === 'super_admin').length,
    unverified: admins.filter((a) => !a.email_confirmed_at).length,
  }), [admins]);

  const statusBadge = (s: string) => {
    const map: Record<string, { v: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      pending: { v: 'outline', icon: <Clock className="w-3 h-3" /> },
      accepted: { v: 'default', icon: <CheckCircle2 className="w-3 h-3" /> },
      expired: { v: 'destructive', icon: <XCircle className="w-3 h-3" /> },
      cancelled: { v: 'secondary', icon: <XCircle className="w-3 h-3" /> },
    };
    const m = map[s] ?? map.cancelled;
    return <Badge variant={m.v} className="gap-1 capitalize">{m.icon}{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          {[['Active admins', stats.active], ['Super admins', stats.supers], ['Pending invites', pending.length], ['Unverified emails', stats.unverified]].map(([l, n]) => (
            <Card key={l as string}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-semibold">{n as number}</p></CardContent></Card>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />Refresh</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><UserPlus className="w-4 h-4 mr-2" />Send invite</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite an administrator</DialogTitle>
                <DialogDescription>They get a single-use link (valid 24 hours). Opening it verifies their email; they set a password and their account is activated.</DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
                <div className="space-y-2">
                  <Label htmlFor="inv-email">Work email</Label>
                  <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required maxLength={255} />
                  {email && !EMAIL_RE.test(email.trim()) && <p className="text-xs text-destructive">Enter a valid email address</p>}
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRoleSel(v as Role)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{ROLES.find((r) => r.value === role)?.desc}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={send.isPending || !EMAIL_RE.test(email.trim())}>
                    {send.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}Send invitation
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{(error as Error).message}</AlertDescription></Alert>}

      <Tabs defaultValue="admins">
        <TabsList>
          <TabsTrigger value="admins">Administrators ({admins.length})</TabsTrigger>
          <TabsTrigger value="invites">Invitations ({invites.length})</TabsTrigger>
          <TabsTrigger value="rights">Roles & rights</TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          <Card><CardContent className="p-0 overflow-x-auto">
            {isLoading ? <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Admin</TableHead><TableHead>Role</TableHead><TableHead>Email</TableHead>
                  <TableHead>Last sign-in</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Access</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {admins.map((a) => {
                    const self = a.id === data?.caller_id;
                    return (
                      <TableRow key={a.id}>
                        <TableCell><div className="font-medium">{a.full_name || '—'}{self && <Badge variant="outline" className="ml-2">You</Badge>}</div><div className="text-xs text-muted-foreground">{a.email}</div></TableCell>
                        <TableCell>
                          <Select value={a.role} disabled={self || setRole.isPending} onValueChange={(v) => setRole.mutate({ adminId: a.id, role: v as Role })}>
                            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{a.auth_missing ? <Badge variant="destructive">No login account</Badge> : a.email_confirmed_at ? <Badge variant="secondary">Verified</Badge> : <Badge variant="outline">Unverified</Badge>}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmt(a.last_sign_in_at)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmt(a.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{a.is_active ? 'Active' : 'Revoked'}</span>
                            <Switch checked={a.is_active} disabled={self || setActive.isPending}
                              onCheckedChange={(v) => { if (v || window.confirm(`Revoke portal access for ${a.email}? Their sessions end immediately.`)) setActive.mutate({ adminId: a.id, active: v }); }} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="invites">
          <Card><CardContent className="p-0 overflow-x-auto">
            {invites.length === 0 ? <div className="p-8 text-center text-muted-foreground"><Mail className="w-8 h-8 mx-auto mb-2" />No invitations yet</div> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead><TableHead>Expires / accepted</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {invites.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.email}</TableCell>
                      <TableCell><Badge variant="secondary">{roleLabel(i.role)}</Badge></TableCell>
                      <TableCell>{statusBadge(i.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmt(i.created_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{i.status === 'accepted' ? fmt(i.accepted_at) : fmt(i.expires_at)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {i.status !== 'accepted' && <Button size="sm" variant="outline" disabled={resend.isPending} onClick={() => resend.mutate(i.id)}><RefreshCw className="w-3 h-3 mr-1" />Resend</Button>}
                        {i.status === 'pending' && <Button size="sm" variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate(i.id)}><XCircle className="w-3 h-3 mr-1" />Cancel</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="rights">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />What each role can do</CardTitle>
              <CardDescription>Enforced on the server for every action; the screen only mirrors it.</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Capability</TableHead>{ROLES.map((r) => <TableHead key={r.value}>{r.label}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {[
                    ['Sign in to the admin portal', true, true, true],
                    ['Manage tenants, onboarding, domains', true, false, false],
                    ['Billing, payments, payouts', true, false, false],
                    ['Invite / revoke admins, change roles', true, false, false],
                    ['AI control, governance, knowledge base', true, false, false],
                    ['Send emails & platform monitoring', true, false, false],
                  ].map(([cap, ...vals]) => (
                    <TableRow key={cap as string}><TableCell>{cap}</TableCell>
                      {vals.map((v, idx) => <TableCell key={idx}>{v ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-3">Safeguards: you can’t change your own role or access, the last active super admin can’t be demoted or revoked, invites are single-use and expire in 24 hours, and every change is recorded in the admin audit log.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
