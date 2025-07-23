
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubscriptionBillingResponse {
  active_subscriptions: Array<{
    id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    billing_plan: {
      name: string;
      price_monthly: number;
      price_annually: number;
    } | null;
  }>;
  payment_records: Array<{
    id: string;
    amount: number;
    status: string;
    created_at: string;
    payment_method: string;
  }>;
  invoices: Array<{
    id: string;
    amount: number;
    status: string;
    created_at: string;
    due_date: string;
  }>;
  upcoming_renewals: Array<{
    id: string;
    renewal_date: string;
    amount: number;
    status: string;
  }>;
  billing_summary: {
    total_revenue: number;
    monthly_revenue: number;
    outstanding_amount: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tenantId = url.pathname.split('/')[3]; // Extract tenant ID from path

    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'Tenant ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get active subscriptions with billing plans
    const { data: subscriptions } = await supabaseClient
      .from('tenant_subscriptions')
      .select(`
        id,
        status,
        current_period_start,
        current_period_end,
        billing_plans (
          name,
          price_monthly,
          price_annually
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    // Get payment records
    const { data: payments } = await supabaseClient
      .from('payment_records')
      .select('id, amount, status, created_at, payment_method')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get invoices
    const { data: invoices } = await supabaseClient
      .from('invoices')
      .select('id, amount, status, created_at, due_date')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get upcoming renewals
    const { data: renewals } = await supabaseClient
      .from('subscription_renewals')
      .select('id, renewal_date, amount, status')
      .eq('tenant_id', tenantId)
      .gte('renewal_date', new Date().toISOString())
      .order('renewal_date', { ascending: true })
      .limit(5);

    // Calculate billing summary
    const completedPayments = payments?.filter(p => p.status === 'completed') || [];
    const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    
    const monthlyRevenue = completedPayments
      .filter(p => new Date(p.created_at) >= thisMonthStart)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const outstandingAmount = invoices
      ?.filter(i => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + (i.amount || 0), 0) || 0;

    const response: SubscriptionBillingResponse = {
      active_subscriptions: subscriptions || [],
      payment_records: payments || [],
      invoices: invoices || [],
      upcoming_renewals: renewals || [],
      billing_summary: {
        total_revenue: totalRevenue,
        monthly_revenue: monthlyRevenue,
        outstanding_amount: outstandingAmount,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in tenant-subscriptions-billing:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
