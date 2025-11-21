
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { 
      tenant_id, 
      amount, 
      currency, 
      description, 
      customer_email,
      metadata = {},
      return_url,
      cancel_url,
      gateway_type,
      // Farmer subscription fields (legacy farmer-payment support)
      farmerId,
      planId
    } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Handle farmer subscription payment (legacy farmer-payment logic)
    if (farmerId && planId) {
      return await processFarmerSubscription(supabaseClient, { 
        farmerId, 
        tenantId: tenant_id, 
        planId, 
        amount, 
        currency, 
        gateway: gateway_type || 'virtual' 
      })
    }

    // Get tenant's payment configuration
    const { data: paymentConfig, error: configError } = await supabaseClient
      .from('tenant_payment_configs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('gateway_type', gateway_type || 'stripe')
      .eq('is_active', true)
      .single()

    if (configError && gateway_type !== 'cash_mode') {
      // Fall back to cash mode if no configuration found
      const cashResult = await processCashModePayment({
        tenant_id,
        amount,
        currency,
        description,
        metadata,
        supabaseClient
      })
      return new Response(
        JSON.stringify(cashResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let paymentResult

    switch (paymentConfig?.gateway_type || 'cash_mode') {
      case 'stripe':
        paymentResult = await processStripePayment({
          config: paymentConfig,
          amount,
          currency,
          description,
          customer_email,
          metadata,
          return_url,
          cancel_url
        })
        break
      case 'paypal':
        paymentResult = await processPayPalPayment({
          config: paymentConfig,
          amount,
          currency,
          description,
          return_url,
          cancel_url
        })
        break
      case 'razorpay':
        paymentResult = await processRazorpayPayment({
          config: paymentConfig,
          amount,
          currency,
          description,
          customer_email
        })
        break
      case 'cash_mode':
      default:
        paymentResult = await processCashModePayment({
          tenant_id,
          amount,
          currency,
          description,
          metadata,
          supabaseClient
        })
        break
    }

    // Record transaction in database
    const { error: transactionError } = await supabaseClient
      .from('payment_transactions')
      .insert({
        tenant_id,
        gateway_type: paymentConfig?.gateway_type || 'cash_mode',
        amount,
        currency,
        status: paymentResult.success ? 'completed' : 'failed',
        description,
        metadata,
        gateway_response: paymentResult.gateway_response || {},
        external_transaction_id: paymentResult.transaction_id,
        payment_intent_id: (paymentResult as any).payment_intent_id,
        processed_at: paymentResult.success ? new Date().toISOString() : null,
        failed_at: !paymentResult.success ? new Date().toISOString() : null,
        failure_reason: (paymentResult as any).error
      })

    if (transactionError) {
      console.error('Error recording transaction:', transactionError)
    }

    return new Response(
      JSON.stringify(paymentResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing payment:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function processStripePayment(params: any) {
  try {
    const { config, amount, currency, description, customer_email, metadata, return_url, cancel_url } = params
    const { secret_key } = config.api_keys

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret_key}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'line_items[0][price_data][currency]': currency,
        'line_items[0][price_data][unit_amount]': (amount * 100).toString(),
        'line_items[0][price_data][product_data][name]': description || 'Payment',
        'line_items[0][quantity]': '1',
        'success_url': return_url || 'https://example.com/success',
        'cancel_url': cancel_url || 'https://example.com/cancel',
        ...(customer_email && { 'customer_email': customer_email })
      })
    })

    const session = await response.json()

    if (response.ok) {
      return {
        success: true,
        payment_url: session.url,
        transaction_id: session.id,
        payment_intent_id: session.payment_intent,
        gateway_response: session
      }
    } else {
      return {
        success: false,
        error: session.error?.message || 'Stripe payment failed'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `Stripe error: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

async function processPayPalPayment(params: any) {
  try {
    const { config, amount, currency, description, return_url, cancel_url } = params
    const { client_id, client_secret } = config.api_keys

    // Get PayPal access token
    const authResponse = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${client_id}:${client_secret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })

    const authData = await authResponse.json()

    if (!authResponse.ok) {
      return {
        success: false,
        error: 'PayPal authentication failed'
      }
    }

    // Create payment
    const paymentResponse = await fetch('https://api.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toString()
          },
          description: description || 'Payment'
        }],
        application_context: {
          return_url: return_url || 'https://example.com/success',
          cancel_url: cancel_url || 'https://example.com/cancel'
        }
      })
    })

    const paymentData = await paymentResponse.json()

    if (paymentResponse.ok) {
      const approvalLink = paymentData.links.find((link: any) => link.rel === 'approve')
      return {
        success: true,
        payment_url: approvalLink?.href,
        transaction_id: paymentData.id,
        gateway_response: paymentData
      }
    } else {
      return {
        success: false,
        error: paymentData.message || 'PayPal payment failed'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `PayPal error: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

async function processRazorpayPayment(params: any) {
  try {
    const { config, amount, currency, description, customer_email } = params
    const { key_id, key_secret } = config.api_keys

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${key_id}:${key_secret}`)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount * 100, // Razorpay amount is in paise
        currency: currency,
        notes: {
          description: description || 'Payment'
        }
      })
    })

    const order = await response.json()

    if (response.ok) {
      return {
        success: true,
        transaction_id: order.id,
        gateway_response: order,
        // Note: Razorpay requires frontend integration for payment completion
        payment_url: null
      }
    } else {
      return {
        success: false,
        error: order.error?.description || 'Razorpay payment failed'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `Razorpay error: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

async function processCashModePayment(params: any) {
  const { tenant_id, amount, currency, description, metadata, supabaseClient } = params
  
  // Cash mode always succeeds for testing
  return {
    success: true,
    transaction_id: `cash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    payment_url: null,
    gateway_response: {
      mode: 'cash',
      message: 'Cash mode payment - automatically approved for testing'
    }
  }
}

async function processFarmerSubscription(supabase: any, params: any) {
  const { farmerId, tenantId, planId, amount, currency, gateway } = params

  console.log('Processing farmer subscription:', params)

  const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single()
  const { data: tenant } = await supabase.from('tenants').select('commission_rate').eq('id', tenantId).single()

  if (!plan) {
    return new Response(
      JSON.stringify({ success: false, error: 'Plan not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const gatewayTxnId = `VIRT-TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const startDate = new Date()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + plan.duration_days)

  const { data: subscription } = await supabase.from('subscriptions').insert({
    farmer_id: farmerId,
    tenant_id: tenantId,
    plan_id: planId,
    payment_gateway: gateway,
    amount,
    currency,
    status: 'active',
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString()
  }).select().single()

  const { data: transaction } = await supabase.from('transactions').insert({
    subscription_id: subscription.id,
    tenant_id: tenantId,
    farmer_id: farmerId,
    gateway,
    gateway_txn_id: gatewayTxnId,
    amount,
    currency,
    virtual_mode: true,
    status: 'success',
    processed_at: new Date().toISOString()
  }).select().single()

  const payoutAmount = amount * ((tenant?.commission_rate || 0) / 100)
  if (payoutAmount > 0) {
    await supabase.from('payouts').insert({
      tenant_id: tenantId,
      transaction_id: transaction.id,
      amount: payoutAmount,
      currency,
      commission_rate: tenant.commission_rate,
      status: 'completed',
      processed_at: new Date().toISOString()
    })
  }

  await supabase.from('farmers').update({
    current_subscription_id: subscription.id,
    subscription_status: 'active',
    subscription_expires_at: endDate.toISOString()
  }).eq('id', farmerId)

  return new Response(
    JSON.stringify({ success: true, subscription, transaction }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
