
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
    const { tenant_id, gateway_type, credentials } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let validationResult = { valid: false, error: 'Unknown gateway type' }

    // Validate based on gateway type
    switch (gateway_type) {
      case 'stripe':
        validationResult = await validateStripeCredentials(credentials)
        break
      case 'paypal':
        validationResult = await validatePayPalCredentials(credentials)
        break
      case 'razorpay':
        validationResult = await validateRazorpayCredentials(credentials)
        break
      case 'cash_mode':
        validationResult = { valid: true, error: null }
        break
      default:
        validationResult = { valid: false, error: 'Unsupported gateway type' }
    }

    // Update validation status in database
    const { error: updateError } = await supabaseClient
      .from('tenant_payment_configs')
      .update({
        validation_status: validationResult.valid ? 'valid' : 'invalid',
        validation_error: validationResult.error,
        last_validated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenant_id)
      .eq('gateway_type', gateway_type)

    if (updateError) {
      console.error('Error updating validation status:', updateError)
    }

    return new Response(
      JSON.stringify(validationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error validating gateway credentials:', error)
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function validateStripeCredentials(credentials: any) {
  try {
    const { secret_key } = credentials
    
    if (!secret_key || !secret_key.startsWith('sk_')) {
      return { valid: false, error: 'Invalid Stripe secret key format' }
    }

    // Test API call to Stripe
    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${secret_key}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    if (response.ok) {
      return { valid: true, error: null }
    } else {
      const error = await response.text()
      return { valid: false, error: `Stripe validation failed: ${error}` }
    }
  } catch (error) {
    return { valid: false, error: `Stripe validation error: ${error.message}` }
  }
}

async function validatePayPalCredentials(credentials: any) {
  try {
    const { client_id, client_secret } = credentials
    
    if (!client_id || !client_secret) {
      return { valid: false, error: 'PayPal client ID and secret are required' }
    }

    // Test PayPal OAuth
    const authString = btoa(`${client_id}:${client_secret}`)
    const response = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })

    if (response.ok) {
      return { valid: true, error: null }
    } else {
      const error = await response.text()
      return { valid: false, error: `PayPal validation failed: ${error}` }
    }
  } catch (error) {
    return { valid: false, error: `PayPal validation error: ${error.message}` }
  }
}

async function validateRazorpayCredentials(credentials: any) {
  try {
    const { key_id, key_secret } = credentials
    
    if (!key_id || !key_secret) {
      return { valid: false, error: 'Razorpay key ID and secret are required' }
    }

    if (!key_id.startsWith('rzp_')) {
      return { valid: false, error: 'Invalid Razorpay key ID format' }
    }

    // Test Razorpay API
    const authString = btoa(`${key_id}:${key_secret}`)
    const response = await fetch('https://api.razorpay.com/v1/payments', {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok || response.status === 400) { // 400 is expected for empty request
      return { valid: true, error: null }
    } else {
      const error = await response.text()
      return { valid: false, error: `Razorpay validation failed: ${error}` }
    }
  } catch (error) {
    return { valid: false, error: `Razorpay validation error: ${error.message}` }
  }
}
