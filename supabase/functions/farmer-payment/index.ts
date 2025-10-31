import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { farmerId, tenantId, planId, amount, currency, gateway } = await req.json();

    const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single();
    const { data: tenant } = await supabase.from('tenants').select('commission_rate').eq('id', tenantId).single();

    const gatewayTxnId = `VIRT-TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration_days);

    const { data: subscription } = await supabase.from('subscriptions').insert({
      farmer_id: farmerId, tenant_id: tenantId, plan_id: planId, payment_gateway: gateway,
      amount, currency, status: 'active', start_date: startDate.toISOString(), end_date: endDate.toISOString()
    }).select().single();

    const { data: transaction } = await supabase.from('transactions').insert({
      subscription_id: subscription.id, tenant_id: tenantId, farmer_id: farmerId, gateway,
      gateway_txn_id: gatewayTxnId, amount, currency, virtual_mode: true, status: 'success',
      processed_at: new Date().toISOString()
    }).select().single();

    const payoutAmount = amount * ((tenant.commission_rate || 0) / 100);
    if (payoutAmount > 0) {
      await supabase.from('payouts').insert({
        tenant_id: tenantId, transaction_id: transaction.id, amount: payoutAmount,
        currency, commission_rate: tenant.commission_rate, status: 'completed',
        processed_at: new Date().toISOString()
      });
    }

    await supabase.from('farmers').update({
      current_subscription_id: subscription.id, subscription_status: 'active',
      subscription_expires_at: endDate.toISOString()
    }).eq('id', farmerId);

    return new Response(JSON.stringify({ success: true, subscription, transaction }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
