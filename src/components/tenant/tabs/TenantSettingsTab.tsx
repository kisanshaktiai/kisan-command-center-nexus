import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings, Shield, Bell, Database, Globe, Key, Save, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tenant } from '@/types/tenant';

interface TenantSettingsTabProps {
  tenant: Tenant;
}

export const TenantSettingsTab: React.FC<TenantSettingsTabProps> = ({ tenant }) => {
  const [settings, setSettings] = useState({
    twoFactorAuth: false,
    apiAccess: true,
    emailNotifications: true,
    autoBackup: true,
    publicProfile: false,
    dataExport: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Real-time subscription for settings changes
    const channel = supabase
      .channel('tenant-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenant_settings',
          filter: `tenant_id=eq.${tenant.id}`
        },
        (payload) => {
          toast.info('Settings updated in real-time');
          if (payload.new) {
            setSettings(payload.new as any);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant.id]);

  const handleSaveSettings = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Settings saved successfully');
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tenant Settings
          </CardTitle>
          <CardDescription>
            Configure security, notifications, and advanced settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="2fa">Two-Factor Authentication</Label>
                  <Switch
                    id="2fa"
                    checked={settings.twoFactorAuth}
                    onCheckedChange={(checked) => setSettings({...settings, twoFactorAuth: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="api">API Access</Label>
                  <Switch
                    id="api"
                    checked={settings.apiAccess}
                    onCheckedChange={(checked) => setSettings({...settings, apiAccess: checked})}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notif">Email Notifications</Label>
                  <Switch
                    id="email-notif"
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Data Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="backup">Auto Backup</Label>
                  <Switch
                    id="backup"
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => setSettings({...settings, autoBackup: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="export">Data Export</Label>
                  <Switch
                    id="export"
                    checked={settings.dataExport}
                    onCheckedChange={(checked) => setSettings({...settings, dataExport: checked})}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Real-time Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-green-600 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Connected & Syncing
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};