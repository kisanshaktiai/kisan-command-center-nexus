import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const WebhookManager = () => {
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  
  // Get the Supabase project URL from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your-project-url';
  const projectId = supabaseUrl.split('//')[1]?.split('.')[0] || 'your-project-id';

  const webhooks = [
    {
      name: 'Razorpay Webhook',
      url: `${supabaseUrl}/functions/v1/payment-webhooks?gateway=razorpay`,
      description: 'Handles Razorpay payment events',
      events: ['payment.captured', 'payment.failed', 'subscription.charged', 'subscription.cancelled'],
      setupSteps: [
        'Go to Razorpay Dashboard → Settings → Webhooks',
        'Click "Create New Webhook"',
        'Paste the webhook URL above',
        'Select all payment and subscription events',
        'Set your webhook secret in Supabase (RAZORPAY_WEBHOOK_SECRET)',
        'Save the webhook'
      ]
    },
    {
      name: 'Stripe Webhook',
      url: `${supabaseUrl}/functions/v1/payment-webhooks?gateway=stripe`,
      description: 'Handles Stripe payment events',
      events: ['payment_intent.succeeded', 'payment_intent.payment_failed', 'customer.subscription.updated'],
      setupSteps: [
        'Go to Stripe Dashboard → Developers → Webhooks',
        'Click "Add endpoint"',
        'Paste the webhook URL above',
        'Select events: payment_intent, charge, customer.subscription, invoice',
        'Copy the webhook signing secret',
        'Add it to Supabase secrets as STRIPE_WEBHOOK_SECRET',
        'Save the endpoint'
      ]
    }
  ];

  const copyToClipboard = async (text: string, name: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(name);
      toast({
        title: 'Copied!',
        description: `${name} URL copied to clipboard`,
      });
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the URL manually',
        variant: 'destructive',
      });
    }
  };

  const testWebhook = (name: string) => {
    toast({
      title: 'Test webhook',
      description: `Testing ${name}... Check edge function logs for details`,
    });
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Configure webhooks in your payment gateway dashboards to receive real-time payment notifications.
          Make sure to add the corresponding webhook secrets to your Supabase environment variables.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {webhooks.map((webhook) => (
          <Card key={webhook.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{webhook.name}</CardTitle>
                  <CardDescription>{webhook.description}</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testWebhook(webhook.name)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Webhook URL */}
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhook.url}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(webhook.url, webhook.name)}
                  >
                    {copiedUrl === webhook.name ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Supported Events */}
              <div className="space-y-2">
                <Label>Supported Events</Label>
                <div className="flex flex-wrap gap-2">
                  {webhook.events.map((event) => (
                    <Badge key={event} variant="secondary">
                      {event}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Setup Instructions */}
              <div className="space-y-2">
                <Label>Setup Instructions</Label>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  {webhook.setupSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Required Environment Variables</CardTitle>
          <CardDescription>
            Add these secrets to your Supabase project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            <div className="p-3 bg-muted rounded-md">
              <div>RAZORPAY_KEY_ID</div>
              <div>RAZORPAY_KEY_SECRET</div>
              <div>RAZORPAY_WEBHOOK_SECRET</div>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <div>STRIPE_SECRET_KEY</div>
              <div>STRIPE_PUBLISHABLE_KEY</div>
              <div>STRIPE_WEBHOOK_SECRET</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
