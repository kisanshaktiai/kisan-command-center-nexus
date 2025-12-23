import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature, x-razorpay-signature',
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

    // Detect gateway type from headers or path
    const stripeSignature = req.headers.get('stripe-signature');
    const razorpaySignature = req.headers.get('x-razorpay-signature');
    const url = new URL(req.url);
    const gateway = url.searchParams.get('gateway') || 
                    (stripeSignature ? 'stripe' : razorpaySignature ? 'razorpay' : null);

    if (!gateway) {
      return new Response(
        JSON.stringify({ error: 'Gateway not identified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${gateway} webhook`);

    if (gateway === 'stripe') {
      return await handleStripeWebhook(req, supabase, stripeSignature);
    } else if (gateway === 'razorpay') {
      return await handleRazorpayWebhook(req, supabase, razorpaySignature);
    }

    return new Response(
      JSON.stringify({ error: 'Unsupported gateway' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleStripeWebhook(req: Request, supabase: any, signature: string | null) {
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

  if (!webhookSecret || !stripeSecretKey) {
    console.error('Stripe credentials not configured');
    return new Response(
      JSON.stringify({ error: 'Webhook not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch (err) {
    console.error('Stripe signature verification failed:', err);
    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Stripe event type:', event.type);

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handleStripePaymentSuccess(supabase, event.data.object as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      await handleStripePaymentFailed(supabase, event.data.object as Stripe.PaymentIntent);
      break;
    case 'charge.succeeded':
      await handleStripeChargeSuccess(supabase, event.data.object as Stripe.Charge);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleStripeSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleStripeSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
      break;
    case 'invoice.paid':
      await handleStripeInvoicePaid(supabase, event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handleStripeInvoiceFailed(supabase, event.data.object as Stripe.Invoice);
      break;
    default:
      console.log('Unhandled Stripe event:', event.type);
  }

  return new Response(
    JSON.stringify({ received: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleRazorpayWebhook(req: Request, supabase: any, signature: string | null) {
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

  if (!webhookSecret) {
    console.error('Razorpay webhook secret not configured');
    return new Response(
      JSON.stringify({ error: 'Webhook not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const body = await req.text();

  if (signature) {
    const expectedSignature = await generateRazorpaySignature(body, webhookSecret);
    if (signature !== expectedSignature) {
      console.error('Invalid Razorpay signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  const event = JSON.parse(body);
  console.log('Razorpay event:', event.event);

  switch (event.event) {
    case 'payment.captured':
      await handleRazorpayPaymentCaptured(supabase, event.payload.payment.entity);
      break;
    case 'payment.failed':
      await handleRazorpayPaymentFailed(supabase, event.payload.payment.entity);
      break;
    case 'subscription.charged':
      await handleRazorpaySubscriptionCharged(supabase, event.payload.subscription.entity);
      break;
    case 'subscription.completed':
      await handleRazorpaySubscriptionCompleted(supabase, event.payload.subscription.entity);
      break;
    case 'subscription.cancelled':
      await handleRazorpaySubscriptionCancelled(supabase, event.payload.subscription.entity);
      break;
    default:
      console.log('Unhandled Razorpay event:', event.event);
  }

  return new Response(
    JSON.stringify({ received: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Stripe handlers
async function handleStripePaymentSuccess(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing Stripe payment success:', paymentIntent.id);

  const { error } = await supabase
    .from('payment_transactions')
    .update({
      status: 'completed',
      gateway_response: paymentIntent,
      processed_at: new Date().toISOString()
    })
    .eq('payment_intent_id', paymentIntent.id);

  if (error) console.error('Error updating transaction:', error);

  if (paymentIntent.metadata?.subscription_id) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentIntent.metadata.subscription_id);
  }
}

async function handleStripePaymentFailed(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing Stripe payment failed:', paymentIntent.id);

  await supabase
    .from('payment_transactions')
    .update({
      status: 'failed',
      failure_reason: paymentIntent.last_payment_error?.message,
      failed_at: new Date().toISOString(),
      gateway_response: paymentIntent
    })
    .eq('payment_intent_id', paymentIntent.id);
}

async function handleStripeChargeSuccess(supabase: any, charge: Stripe.Charge) {
  console.log('Processing Stripe charge success:', charge.id);
}

async function handleStripeSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  console.log('Processing Stripe subscription updated:', subscription.id);

  const endDate = new Date(subscription.current_period_end * 1000);

  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status === 'active' ? 'active' : subscription.status,
      ends_at: endDate.toISOString(),
      updated_at: new Date().toISOString(),
      metadata: { stripe_subscription: subscription }
    })
    .eq('gateway_subscription_id', subscription.id);
}

async function handleStripeSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  console.log('Processing Stripe subscription deleted:', subscription.id);

  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('gateway_subscription_id', subscription.id);
}

async function handleStripeInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
  console.log('Processing Stripe invoice paid:', invoice.id);

  if (invoice.subscription) {
    await supabase
      .from('payment_transactions')
      .insert({
        tenant_id: invoice.metadata?.tenant_id,
        gateway_type: 'stripe',
        external_transaction_id: invoice.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency.toUpperCase(),
        status: 'completed',
        subscription_id: invoice.metadata?.subscription_id,
        invoice_id: invoice.id,
        gateway_response: invoice,
        processed_at: new Date().toISOString()
      });
  }
}

async function handleStripeInvoiceFailed(supabase: any, invoice: Stripe.Invoice) {
  console.log('Processing Stripe invoice failed:', invoice.id);

  if (invoice.subscription) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'overdue',
        updated_at: new Date().toISOString()
      })
      .eq('gateway_subscription_id', invoice.subscription);
  }
}

// Razorpay handlers
async function handleRazorpayPaymentCaptured(supabase: any, payment: any) {
  console.log('Processing Razorpay payment captured:', payment.id);

  await supabase
    .from('transactions')
    .update({
      status: 'completed',
      gateway_response: payment,
      updated_at: new Date().toISOString()
    })
    .eq('gateway_transaction_id', payment.id);

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

async function handleRazorpayPaymentFailed(supabase: any, payment: any) {
  console.log('Processing Razorpay payment failed:', payment.id);

  await supabase
    .from('transactions')
    .update({
      status: 'failed',
      gateway_response: payment,
      updated_at: new Date().toISOString()
    })
    .eq('gateway_transaction_id', payment.id);
}

async function handleRazorpaySubscriptionCharged(supabase: any, subscription: any) {
  console.log('Processing Razorpay subscription charged:', subscription.id);
}

async function handleRazorpaySubscriptionCompleted(supabase: any, subscription: any) {
  console.log('Processing Razorpay subscription completed:', subscription.id);

  await supabase
    .from('subscriptions')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString()
    })
    .eq('gateway_subscription_id', subscription.id);
}

async function handleRazorpaySubscriptionCancelled(supabase: any, subscription: any) {
  console.log('Processing Razorpay subscription cancelled:', subscription.id);

  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('gateway_subscription_id', subscription.id);
}

async function generateRazorpaySignature(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
