import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get webhook signature and secret
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error('Razorpay webhook secret not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get raw body for signature verification
    const body = await req.text();
    
    // Verify signature
    if (signature && webhookSecret) {
      const expectedSignature = await generateSignature(body, webhookSecret);
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const event = JSON.parse(body);
    console.log('Razorpay webhook event:', event.event);

    // Handle different event types
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(supabase, event.payload.payment.entity);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(supabase, event.payload.payment.entity);
        break;
      
      case 'order.paid':
        await handleOrderPaid(supabase, event.payload.order.entity);
        break;
      
      case 'subscription.charged':
        await handleSubscriptionCharged(supabase, event.payload.subscription.entity);
        break;
      
      case 'subscription.completed':
        await handleSubscriptionCompleted(supabase, event.payload.subscription.entity);
        break;
      
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(supabase, event.payload.subscription.entity);
        break;

      default:
        console.log('Unhandled event type:', event.event);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateSignature(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function handlePaymentCaptured(supabase: any, payment: any) {
  console.log('Processing payment.captured:', payment.id);
  
  // Update transaction status
  const { error } = await supabase
    .from('transactions')
    .update({
      status: 'completed',
      gateway_response: payment,
      updated_at: new Date().toISOString()
    })
    .eq('gateway_transaction_id', payment.id);

  if (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }

  // If this is a subscription payment, activate the subscription
  if (payment.notes?.subscription_id) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.notes.subscription_id);
  }
}

async function handlePaymentFailed(supabase: any, payment: any) {
  console.log('Processing payment.failed:', payment.id);
  
  await supabase
    .from('transactions')
    .update({
      status: 'failed',
      gateway_response: payment,
      updated_at: new Date().toISOString()
    })
    .eq('gateway_transaction_id', payment.id);

  // If this is a subscription payment, mark subscription as failed
  if (payment.notes?.subscription_id) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.notes.subscription_id);
  }
}

async function handleOrderPaid(supabase: any, order: any) {
  console.log('Processing order.paid:', order.id);
  // Additional order processing logic
}

async function handleSubscriptionCharged(supabase: any, subscription: any) {
  console.log('Processing subscription.charged:', subscription.id);
  // Handle recurring subscription charges
}

async function handleSubscriptionCompleted(supabase: any, subscription: any) {
  console.log('Processing subscription.completed:', subscription.id);
  
  await supabase
    .from('subscriptions')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString()
    })
    .eq('gateway_subscription_id', subscription.id);
}

async function handleSubscriptionCancelled(supabase: any, subscription: any) {
  console.log('Processing subscription.cancelled:', subscription.id);
  
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('gateway_subscription_id', subscription.id);
}
