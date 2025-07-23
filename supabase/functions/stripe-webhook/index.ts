
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
})

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
)

serve(async (req) => {
  const signature = req.headers.get("stripe-signature")
  const body = await req.text()
  
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    )
  } catch (err) {
    console.error(`Webhook signature verification failed.`, err.message)
    return new Response(err.message, { status: 400 })
  }

  console.log(`Received event: ${event.type}`)

  try {
    switch (event.type) {
      case 'invoice.created':
        await handleInvoiceCreated(event.data.object as Stripe.Invoice)
        break
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response(error.message, { status: 500 })
  }
})

async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  const tenantId = invoice.metadata?.tenant_id
  if (!tenantId) return

  // Create invoice record in database
  await supabaseClient.from('invoices').insert({
    tenant_id: tenantId,
    invoice_number: invoice.number || `INV-${Date.now()}`,
    amount: invoice.amount_due / 100,
    currency: invoice.currency.toUpperCase(),
    status: 'sent',
    due_date: new Date(invoice.due_date * 1000).toISOString().split('T')[0],
    stripe_invoice_id: invoice.id,
    line_items: invoice.lines.data.map(line => ({
      description: line.description,
      amount: line.amount / 100,
      quantity: line.quantity
    })),
    metadata: { stripe_invoice_url: invoice.hosted_invoice_url }
  })
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const tenantId = invoice.metadata?.tenant_id
  if (!tenantId) return

  // Update invoice as paid
  await supabaseClient
    .from('invoices')
    .update({
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0]
    })
    .eq('stripe_invoice_id', invoice.id)

  // Create payment record
  await supabaseClient.from('payment_records').insert({
    tenant_id: tenantId,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency.toUpperCase(),
    payment_method: 'stripe',
    transaction_id: invoice.payment_intent as string,
    status: 'completed',
    processed_at: new Date().toISOString(),
    gateway_response: { invoice_id: invoice.id }
  })
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const tenantId = invoice.metadata?.tenant_id
  if (!tenantId) return

  // Update invoice as overdue
  await supabaseClient
    .from('invoices')
    .update({ status: 'overdue' })
    .eq('stripe_invoice_id', invoice.id)

  // Create failed payment record
  await supabaseClient.from('payment_records').insert({
    tenant_id: tenantId,
    amount: invoice.amount_due / 100,
    currency: invoice.currency.toUpperCase(),
    payment_method: 'stripe',
    status: 'failed',
    processed_at: new Date().toISOString(),
    gateway_response: { invoice_id: invoice.id, error: 'Payment failed' }
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenant_id
  if (!tenantId) return

  await supabaseClient
    .from('tenant_subscriptions')
    .update({
      status: subscription.status === 'active' ? 'active' : 'past_due',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString().split('T')[0],
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0]
    })
    .eq('tenant_id', tenantId)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenant_id
  if (!tenantId) return

  await supabaseClient
    .from('tenant_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    })
    .eq('tenant_id', tenantId)

  // Disable tenant features
  await supabaseClient.rpc('disable_expired_tenant_features')
}
