import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error('Stripe webhook secret not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();
    
    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Stripe webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(supabase, event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(supabase, event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'charge.succeeded':
        await handleChargeSucceeded(supabase, event.data.object as Stripe.Charge);
        break;
      
      case 'charge.failed':
        await handleChargeFailed(supabase, event.data.object as Stripe.Charge);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.paid':
        await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice);
        break;

      default:
        console.log('Unhandled event type:', event.type);
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

async function handlePaymentIntentSucceeded(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing payment_intent.succeeded:', paymentIntent.id);
  
  const { error } = await supabase
    .from('transactions')
    .update({
      status: 'completed',
      gateway_response: paymentIntent,
      updated_at: new Date().toISOString()
    })
    .eq('gateway_transaction_id', paymentIntent.id);

  if (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }

  // If this is a subscription payment, activate the subscription
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

async function handlePaymentIntentFailed(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing payment_intent.payment_failed:', paymentIntent.id);
  
  await supabase
    .from('transactions')
    .update({
      status: 'failed',
      gateway_response: paymentIntent,
      updated_at: new Date().toISOString()
    })
    .eq('gateway_transaction_id', paymentIntent.id);

  if (paymentIntent.metadata?.subscription_id) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentIntent.metadata.subscription_id);
  }
}

async function handleChargeSucceeded(supabase: any, charge: Stripe.Charge) {
  console.log('Processing charge.succeeded:', charge.id);
  // Additional charge processing logic
}

async function handleChargeFailed(supabase: any, charge: Stripe.Charge) {
  console.log('Processing charge.failed:', charge.id);
  // Handle failed charges
}

async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  console.log('Processing subscription updated:', subscription.id);
  
  const status = subscription.status === 'active' ? 'active' :
                 subscription.status === 'canceled' ? 'cancelled' :
                 subscription.status === 'past_due' ? 'overdue' : 'pending';

  await supabase
    .from('subscriptions')
    .update({
      status,
      ends_at: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('gateway_subscription_id', subscription.id);
}

async function handleSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  console.log('Processing subscription.deleted:', subscription.id);
  
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('gateway_subscription_id', subscription.id);
}

async function handleInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
  console.log('Processing invoice.paid:', invoice.id);
  
  // Record the payment
  if (invoice.subscription && typeof invoice.subscription === 'string') {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('gateway_subscription_id', invoice.subscription)
      .single();

    if (subscription) {
      await supabase.from('transactions').insert({
        farmer_id: subscription.farmer_id,
        tenant_id: subscription.tenant_id,
        subscription_id: subscription.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency.toUpperCase(),
        status: 'completed',
        payment_method: invoice.payment_intent ? 'card' : 'other',
        gateway: 'stripe',
        gateway_transaction_id: invoice.payment_intent as string || invoice.id,
        gateway_response: invoice
      });
    }
  }
}

async function handleInvoicePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  console.log('Processing invoice.payment_failed:', invoice.id);
  
  if (invoice.subscription && typeof invoice.subscription === 'string') {
    await supabase
      .from('subscriptions')
      .update({
        status: 'overdue',
        updated_at: new Date().toISOString()
      })
      .eq('gateway_subscription_id', invoice.subscription);
  }
}
