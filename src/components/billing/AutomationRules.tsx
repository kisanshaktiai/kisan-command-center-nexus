import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Zap, Mail, MessageSquare, RefreshCw, Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBillingRealtime } from '@/hooks/useBillingRealtime';
import { TableRowSkeleton } from '@/components/ui/loading-skeleton';

export function AutomationRules() {
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['billing-automation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_automation_rules')
        .select('*')
        .order('rule_type')
        .order('rule_name');

      if (error) {
        console.error('Error fetching automation rules:', error);
        throw error;
      }
      return data;
    },
    staleTime: 30000,
    retry: 2,
  });

  // Real-time updates for automation rules
  useBillingRealtime({
    eventType: 'subscription',
    queryKey: ['billing-automation-rules'],
    showNotifications: false
  });

  const { data: notifications } = useQuery({
    queryKey: ['recent-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('billing_automation_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-automation-rules'] });
      toast.success('Automation rule updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });

  const getRuleIcon = (ruleType: string) => {
    switch (ruleType) {
      case 'payment_reminder': return <Bell className="h-5 w-5 text-primary" />;
      case 'failed_payment_retry': return <RefreshCw className="h-5 w-5 text-warning" />;
      case 'subscription_expiry': return <Zap className="h-5 w-5 text-destructive" />;
      default: return <Zap className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <TableRowSkeleton />
        <TableRowSkeleton />
        <TableRowSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Automation Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Billing Automation Rules</CardTitle>
              <CardDescription>Configure automated notifications and actions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules?.map((rule) => {
              const actionConfig = rule.action_config as any;
              const triggerConfig = rule.trigger_condition as any;
              
              return (
                <div key={rule.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      {getRuleIcon(rule.rule_type)}
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {rule.rule_name}
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Type: {rule.rule_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => 
                        toggleRuleMutation.mutate({ ruleId: rule.id, isActive: checked })
                      }
                    />
                  </div>
                  
                  <div className="ml-8 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Trigger:</span>
                      <span className="font-medium">
                        {Object.entries(triggerConfig).map(([key, value]) => 
                          `${key.replace(/_/g, ' ')}: ${value}`
                        ).join(', ')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="text-muted-foreground">Channels:</span>
                      {actionConfig.email && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> Email
                        </Badge>
                      )}
                      {actionConfig.sms && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> SMS
                        </Badge>
                      )}
                      {actionConfig.whatsapp && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> WhatsApp
                        </Badge>
                      )}
                      {actionConfig.retry_payment && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" /> Auto-Retry
                        </Badge>
                      )}
                    </div>

                    {rule.execution_count > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Executed {rule.execution_count} times
                        {rule.last_executed_at && ` • Last: ${new Date(rule.last_executed_at).toLocaleString()}`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>Latest automated notifications sent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications?.map((notification) => (
              <div key={notification.id} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex items-start gap-3">
                  {getChannelIcon(notification.channel)}
                  <div>
                    <p className="font-medium text-sm">{notification.notification_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      To: {notification.recipient}
                    </p>
                    {notification.subject && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Subject: {notification.subject}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={notification.status === 'sent' ? 'default' : notification.status === 'failed' ? 'destructive' : 'secondary'}
                >
                  {notification.status}
                </Badge>
              </div>
            ))}

            {(!notifications || notifications.length === 0) && (
              <div className="text-center py-6 text-muted-foreground">
                No notifications sent yet. Automation rules will trigger notifications based on configured conditions.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}