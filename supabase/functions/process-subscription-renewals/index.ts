
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import Stripe from "https://esm.sh/stripe@14.21.0"

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
)

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
})

serve(async (req) => {
  try {
    console.log('Processing subscription renewals...')

    // Get pending renewals that are due
    const { data: pendingRenewals, error: renewalsError } = await supabaseClient
      .from('subscription_renewals')
      .select(`
        *,
        tenant_subscriptions(
          *,
          billing_plans(*)
        )
      `)
      .eq('status', 'pending')
      .lte('renewal_date', new Date().toISOString().split('T')[0])

    if (renewalsError) {
      throw renewalsError
    }

    console.log(`Found ${pendingRenewals?.length || 0} pending renewals`)

    for (const renewal of pendingRenewals || []) {
      try {
        // Get tenant information
        const { data: tenant } = await supabaseClient
          .from('tenants')
          .select('*')
          .eq('id', renewal.tenant_id)
          .single()

        if (!tenant) {
          console.error(`Tenant not found for renewal ${renewal.id}`)
          continue
        }

        // Find Stripe customer
        const customers = await stripe.customers.list({
          email: tenant.owner_email,
          limit: 1
        })

        if (customers.data.length === 0) {
          console.error(`Stripe customer not found for tenant ${tenant.id}`)
          await supabaseClient
            .from('subscription_renewals')
            .update({ 
              status: 'failed',
              processed_at: new Date().toISOString()
            })
            .eq('id', renewal.id)
          continue
        }

        const customer = customers.data[0]

        // Create invoice for renewal
        const invoice = await stripe.invoices.create({
          customer: customer.id,
          collection_method: 'charge_automatically',
          metadata: {
            tenant_id: renewal.tenant_id,
            renewal_id: renewal.id
          }
        })

        // Add invoice item
        await stripe.invoiceItems.create({
          customer: customer.id,
          invoice: invoice.id,
          amount: Math.round(renewal.amount * 100), // Convert to cents
          currency: renewal.currency.toLowerCase(),
          description: `Subscription renewal - ${renewal.tenant_subscriptions?.billing_plans?.name || 'Unknown Plan'}`
        })

        // Finalize and pay invoice
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)
        const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id)

        if (paidInvoice.status === 'paid') {
          // Update renewal as processed
          await supabaseClient
            .from('subscription_renewals')
            .update({
              status: 'processed',
              processed_at: new Date().toISOString()
            })
            .eq('id', renewal.id)

          // Extend subscription period
          const newEndDate = new Date(renewal.tenant_subscriptions.current_period_end)
          newEndDate.setMonth(newEndDate.getMonth() + 1) // Assuming monthly billing

          await supabaseClient
            .from('tenant_subscriptions')
            .update({
              current_period_start: renewal.tenant_subscriptions.current_period_end,
              current_period_end: newEndDate.toISOString().split('T')[0],
              status: 'active'
            })
            .eq('id', renewal.tenant_subscriptions.id)

          // Create invoice record
          await supabaseClient.from('invoices').insert({
            tenant_id: renewal.tenant_id,
            invoice_number: finalizedInvoice.number || `INV-${Date.now()}`,
            amount: renewal.amount,
            currency: renewal.currency,
            status: 'paid',
            due_date: new Date(finalizedInvoice.due_date * 1000).toISOString().split('T')[0],
            paid_date: new Date().toISOString().split('T')[0],
            stripe_invoice_id: finalizedInvoice.id,
            line_items: [{
              description: `Subscription renewal - ${renewal.tenant_subscriptions?.billing_plans?.name || 'Unknown Plan'}`,
              amount: renewal.amount,
              quantity: 1
            }]
          })

          // Create payment record
          await supabaseClient.from('payment_records').insert({
            tenant_id: renewal.tenant_id,
            amount: renewal.amount,
            currency: renewal.currency,
            payment_method: 'stripe',
            transaction_id: paidInvoice.payment_intent as string,
            status: 'completed',
            processed_at: new Date().toISOString()
          })

          console.log(`Successfully processed renewal ${renewal.id} for tenant ${renewal.tenant_id}`)
        } else {
          // Mark renewal as failed
          await supabaseClient
            .from('subscription_renewals')
            .update({
              status: 'failed',
              processed_at: new Date().toISOString()
            })
            .eq('id', renewal.id)

          console.error(`Failed to process renewal ${renewal.id} - invoice status: ${paidInvoice.status}`)
        }

      } catch (error) {
        console.error(`Error processing renewal ${renewal.id}:`, error)
        
        // Mark renewal as failed
        await supabaseClient
          .from('subscription_renewals')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString()
          })
          .eq('id', renewal.id)
      }
    }

    // Also run the feature disabling function for expired subscriptions
    await supabaseClient.rpc('disable_expired_tenant_features')

    return new Response(JSON.stringify({ 
      success: true, 
      processed: pendingRenewals?.length || 0 
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    console.error('Error processing renewals:', error)
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
