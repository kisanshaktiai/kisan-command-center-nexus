import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Starting subscription renewal process...');

    // Find subscriptions expiring in the next 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: expiringSubscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        farmers (id, name, email),
        tenants (id, name),
        plans (id, name, price_inr, price_usd, duration_days)
      `)
      .eq('status', 'active')
      .lte('ends_at', threeDaysFromNow.toISOString())
      .is('cancelled_at', null);

    if (fetchError) {
      console.error('Error fetching expiring subscriptions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiringSubscriptions?.length || 0} expiring subscriptions`);

    const results = {
      processed: 0,
      renewed: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const subscription of expiringSubscriptions || []) {
      try {
        console.log(`Processing renewal for subscription ${subscription.id}`);
        results.processed++;

        // Check if farmer has auto-renewal enabled (assuming metadata field)
        const autoRenewalEnabled = subscription.metadata?.auto_renewal !== false;
        
        if (!autoRenewalEnabled) {
          console.log(`Auto-renewal disabled for subscription ${subscription.id}`);
          continue;
        }

        // Calculate new period
        const currentEnd = new Date(subscription.ends_at);
        const newStart = new Date(currentEnd);
        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + (subscription.plans?.duration_days || 30));

        // Determine amount based on currency
        const amount = subscription.currency === 'INR' 
          ? subscription.plans?.price_inr 
          : subscription.plans?.price_usd;

        if (!amount) {
          console.error(`No price found for subscription ${subscription.id}`);
          results.failed++;
          continue;
        }

        // Create transaction record
        const transactionId = `AUTO-RENEW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const { data: transaction, error: txnError } = await supabase
          .from('transactions')
          .insert({
            farmer_id: subscription.farmer_id,
            tenant_id: subscription.tenant_id,
            subscription_id: subscription.id,
            amount,
            currency: subscription.currency,
            status: 'pending',
            payment_method: 'auto_renewal',
            gateway: subscription.gateway || 'virtual',
            gateway_transaction_id: transactionId,
            metadata: {
              renewal_type: 'auto',
              original_subscription_id: subscription.id
            }
          })
          .select()
          .single();

        if (txnError) {
          console.error(`Error creating transaction for ${subscription.id}:`, txnError);
          results.failed++;
          results.errors.push({ subscription_id: subscription.id, error: txnError });
          continue;
        }

        // In production, this would call the payment gateway
        // For now, auto-approve in virtual mode
        const gateway = subscription.gateway || 'virtual';
        
        if (gateway === 'virtual') {
          // Auto-approve renewal
          await supabase
            .from('transactions')
            .update({
              status: 'completed',
              gateway_response: {
                auto_approved: true,
                processed_at: new Date().toISOString()
              }
            })
            .eq('id', transaction.id);

          // Extend subscription
          await supabase
            .from('subscriptions')
            .update({
              starts_at: newStart.toISOString(),
              ends_at: newEnd.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);

          // Calculate and create payout for tenant
          const commissionRate = subscription.tenants?.metadata?.commission_rate || 0.15;
          const tenantCommission = amount * commissionRate;

          await supabase.from('payouts').insert({
            tenant_id: subscription.tenant_id,
            amount: tenantCommission,
            currency: subscription.currency,
            status: 'pending',
            transaction_id: transaction.id,
            payout_method: 'bank_transfer',
            metadata: {
              subscription_id: subscription.id,
              renewal_type: 'auto'
            }
          });

          results.renewed++;
          console.log(`Successfully renewed subscription ${subscription.id}`);
        } else {
          // For real payment gateways, we would:
          // 1. Charge the saved payment method
          // 2. Update transaction based on payment result
          // 3. Extend subscription if successful
          console.log(`Real gateway renewal not implemented for ${gateway}`);
          results.failed++;
        }

      } catch (error) {
        console.error(`Error processing subscription ${subscription.id}:`, error);
        results.failed++;
        results.errors.push({ 
          subscription_id: subscription.id, 
          error: error.message 
        });
      }
    }

    console.log('Renewal process completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Renewal process error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
