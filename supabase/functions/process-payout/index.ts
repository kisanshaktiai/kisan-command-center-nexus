import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { payoutId } = await req.json();

    console.log('Processing payout:', payoutId);

    // Get payout details
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .select(`
        *,
        tenant:tenants(id, name, bank_details, payout_method),
        transaction:transactions(gateway, gateway_txn_id, virtual_mode)
      `)
      .eq('id', payoutId)
      .single();

    if (payoutError || !payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== 'pending') {
      throw new Error(`Payout already ${payout.status}`);
    }

    // Check if transaction was virtual (test mode)
    const isVirtual = payout.transaction?.virtual_mode === true;

    let transferRef = '';
    let gatewayResponse = {};

    if (isVirtual) {
      // Virtual payout - auto-approve
      transferRef = `VIRT-PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      gatewayResponse = {
        mode: 'test',
        status: 'success',
        message: 'Virtual payout - auto-approved',
        timestamp: new Date().toISOString(),
      };
    } else {
      // Real payout logic here
      // In production, integrate with:
      // - RazorpayX for India
      // - Stripe Connect for Global
      
      const payoutMethod = payout.tenant.payout_method || 'bank_transfer';
      const bankDetails = payout.tenant.bank_details || {};

      // Placeholder for actual payout API call
      transferRef = `PENDING-${Date.now()}`;
      gatewayResponse = {
        mode: 'live',
        method: payoutMethod,
        bank_details: bankDetails,
        status: 'initiated',
        message: 'Payout initiated - awaiting gateway confirmation',
      };

      // TODO: Implement actual gateway calls
      // Example for Razorpay:
      // const razorpayResponse = await fetch('https://api.razorpay.com/v1/payouts', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Basic ${btoa(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET)}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     account_number: bankDetails.account_number,
      //     amount: payout.amount * 100, // In paise
      //     currency: payout.currency,
      //     mode: payoutMethod,
      //     purpose: 'payout',
      //     fund_account_id: bankDetails.fund_account_id,
      //   }),
      // });
    }

    // Update payout status
    const { data: updatedPayout, error: updateError } = await supabase
      .from('payouts')
      .update({
        status: isVirtual ? 'completed' : 'processing',
        transfer_ref: transferRef,
        gateway_response: gatewayResponse,
        processed_at: new Date().toISOString(),
      })
      .eq('id', payoutId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update payout');
    }

    return new Response(
      JSON.stringify({
        success: true,
        payout: updatedPayout,
        message: isVirtual 
          ? 'Payout completed (Virtual mode - Test)'
          : 'Payout initiated successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Payout processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payout processing failed',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
