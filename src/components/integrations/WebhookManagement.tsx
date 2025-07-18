
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Webhook, 
  Plus, 
  Edit, 
  Trash2, 
  TestTube, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Copy
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/useTenant';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  events: string[];
  is_active: boolean;
  secret_key?: string;
  retry_count: number;
  timeout_seconds: number;
  tenant_id: string;
  created_at: string;
  last_triggered_at?: string;
  success_count: number;
  failure_count: number;
}

export function WebhookManagement() {
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [testPayload, setTestPayload] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();

  // Fetch webhooks
  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['webhooks', currentTenant?.id],
    queryFn: async (): Promise<WebhookConfig[]> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant context available');
      }

      // Mock data for webhook configs since the table was just created
      const mockConfigs = [
        {
          id: '1',
          name: 'Payment Notifications',
          url: 'https://api.example.com/webhooks/payments',
          method: 'POST' as const,
          headers: { 'Content-Type': 'application/json' },
          events: ['payment.completed', 'payment.failed'],
          is_active: true,
          secret_key: 'secret_123',
          retry_count: 3,
          timeout_seconds: 30,
          tenant_id: currentTenant.id,
          created_at: '2024-01-15T10:00:00Z',
          last_triggered_at: '2024-01-15T12:00:00Z',
          success_count: 45,
          failure_count: 2
        }
      ];
      return mockConfigs;
    },
    enabled: !!currentTenant?.id,
  });

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: async (webhookData: Partial<WebhookConfig>) => {
      if (!currentTenant?.id) {
        throw new Error('No tenant context available');
      }

      // Mock webhook creation since this is a demo
      console.log('Creating webhook config:', webhookData);
      return { 
        id: 'webhook_' + Date.now(),
        ...webhookData,
        tenant_id: currentTenant.id,
        created_at: new Date().toISOString(),
        success_count: 0,
        failure_count: 0
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: 'Success',
        description: 'Webhook created successfully',
      });
      setIsFormOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create webhook: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update webhook mutation
  const updateWebhookMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<WebhookConfig> & { id: string }) => {
      // Mock webhook update since this is a demo
      console.log('Updating webhook config:', id, updateData);
      return {
        id,
        ...updateData,
        updated_at: new Date().toISOString()
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: 'Success',
        description: 'Webhook updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update webhook: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete webhook mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      // Mock webhook deletion since this is a demo
      console.log('Deleting webhook config:', id);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: 'Success',
        description: 'Webhook deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete webhook: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Test webhook mutation
  const testWebhookMutation = useMutation({
    mutationFn: async ({ webhookId, payload }: { webhookId: string; payload: any }) => {
      if (!currentTenant?.id) {
        throw new Error('No tenant context available');
      }

      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook_id: webhookId,
          tenant_id: currentTenant.id,
          test_payload: payload,
        }),
      });

      if (!response.ok) {
        throw new Error('Webhook test failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Webhook test completed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Webhook test failed: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleTestWebhook = (webhook: WebhookConfig) => {
    if (!testPayload.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a test payload',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = JSON.parse(testPayload);
      testWebhookMutation.mutate({ webhookId: webhook.id, payload });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Invalid JSON payload',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (webhook: WebhookConfig) => {
    if (!webhook.is_active) return 'secondary';
    
    const successRate = webhook.success_count / (webhook.success_count + webhook.failure_count);
    if (successRate > 0.9) return 'default';
    if (successRate > 0.7) return 'secondary';
    return 'destructive';
  };

  const getStatusIcon = (webhook: WebhookConfig) => {
    if (!webhook.is_active) return <XCircle className="w-4 h-4" />;
    
    const successRate = webhook.success_count / (webhook.success_count + webhook.failure_count);
    if (successRate > 0.9) return <CheckCircle className="w-4 h-4" />;
    if (successRate > 0.7) return <AlertCircle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  if (!currentTenant) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>No tenant context available. Please ensure you're properly authenticated.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Webhook Management</h2>
          <p className="text-muted-foreground">Configure and manage webhook integrations</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      {/* Webhooks List */}
      <div className="space-y-4">
        {webhooks.map((webhook) => (
          <Card key={webhook.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Webhook className="w-5 h-5" />
                  <div>
                    <CardTitle className="text-lg">{webhook.name}</CardTitle>
                    <CardDescription>{webhook.url}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadge(webhook)}>
                    {getStatusIcon(webhook)}
                    {webhook.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWebhook(webhook)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Method</Label>
                  <p className="font-medium">{webhook.method}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Events</Label>
                  <p className="font-medium">{webhook.events.length} configured</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Success Rate</Label>
                  <p className="font-medium">
                    {webhook.success_count + webhook.failure_count > 0
                      ? `${Math.round((webhook.success_count / (webhook.success_count + webhook.failure_count)) * 100)}%`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Triggered</Label>
                  <p className="font-medium">
                    {webhook.last_triggered_at
                      ? new Date(webhook.last_triggered_at).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>

              {/* Test Section */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <TestTube className="w-4 h-4" />
                  <Label>Test Webhook</Label>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder='{"test": "payload", "timestamp": "2023-01-01T00:00:00Z"}'
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  <Button
                    onClick={() => handleTestWebhook(webhook)}
                    disabled={testWebhookMutation.isPending}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {webhooks.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Webhook className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Webhooks Configured</h3>
              <p className="text-muted-foreground mb-4">
                Set up webhooks to receive real-time notifications about events in your tenant.
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Webhook
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
