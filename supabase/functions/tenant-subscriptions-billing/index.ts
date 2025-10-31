
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Utility function for logging with context
const log = (level: 'info' | 'error' | 'warn', message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, level, message, data }));
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
  const requestId = crypto.randomUUID();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const url = new URL(req.url);
    const tenantId = url.pathname.split('/')[3]; // Extract tenant ID from path (optional)
    
    log('info', 'Processing billing request', { requestId, tenantId, method: req.method });

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      log('error', 'Missing required environment variables', { requestId });
      throw new Error('Server configuration error');
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      { 
        auth: { persistSession: false },
        global: {
          headers: { 'x-request-id': requestId }
        }
      }
    );

    // Build queries - if tenantId is provided, filter by it; otherwise get all tenants
    let subscriptionsQuery = supabaseClient
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
      .eq('status', 'active');

    let paymentsQuery = supabaseClient
      .from('payment_records')
      .select('id, amount, status, created_at, payment_method')
      .order('created_at', { ascending: false })
      .limit(100);

    let invoicesQuery = supabaseClient
      .from('invoices')
      .select('id, amount, status, created_at, due_date')
      .order('created_at', { ascending: false })
      .limit(100);

    let renewalsQuery = supabaseClient
      .from('subscription_renewals')
      .select('id, renewal_date, amount, status')
      .gte('renewal_date', new Date().toISOString())
      .order('renewal_date', { ascending: true })
      .limit(100);

    // Apply tenant filter if tenantId is provided
    if (tenantId) {
      subscriptionsQuery = subscriptionsQuery.eq('tenant_id', tenantId);
      paymentsQuery = paymentsQuery.eq('tenant_id', tenantId);
      invoicesQuery = invoicesQuery.eq('tenant_id', tenantId);
      renewalsQuery = renewalsQuery.eq('tenant_id', tenantId);
    }

    // Execute all queries with error handling
    const [subscriptionsResult, paymentsResult, invoicesResult, renewalsResult] = await Promise.allSettled([
      subscriptionsQuery,
      paymentsQuery,
      invoicesQuery,
      renewalsQuery
    ]);

    // Extract data with fallbacks
    const subscriptions = subscriptionsResult.status === 'fulfilled' ? subscriptionsResult.value.data : [];
    const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value.data : [];
    const invoices = invoicesResult.status === 'fulfilled' ? invoicesResult.value.data : [];
    const renewals = renewalsResult.status === 'fulfilled' ? renewalsResult.value.data : [];

    // Log any failures
    if (subscriptionsResult.status === 'rejected') {
      log('error', 'Failed to fetch subscriptions', { requestId, error: subscriptionsResult.reason });
    }
    if (paymentsResult.status === 'rejected') {
      log('error', 'Failed to fetch payments', { requestId, error: paymentsResult.reason });
    }
    if (invoicesResult.status === 'rejected') {
      log('error', 'Failed to fetch invoices', { requestId, error: invoicesResult.reason });
    }
    if (renewalsResult.status === 'rejected') {
      log('error', 'Failed to fetch renewals', { requestId, error: renewalsResult.reason });
    }

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
      active_subscriptions: subscriptions?.map((sub: any) => ({
        id: sub.id,
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        billing_plan: sub.billing_plans && sub.billing_plans.length > 0 ? {
          name: sub.billing_plans[0].name,
          price_monthly: sub.billing_plans[0].price_monthly,
          price_annually: sub.billing_plans[0].price_annually
        } : null
      })) || [],
      payment_records: payments || [],
      invoices: invoices || [],
      upcoming_renewals: renewals || [],
      billing_summary: {
        total_revenue: totalRevenue,
        monthly_revenue: monthlyRevenue,
        outstanding_amount: outstandingAmount,
      },
    };

    const duration = Date.now() - startTime;
    log('info', 'Request completed successfully', { 
      requestId, 
      duration, 
      tenantId,
      recordCounts: {
        subscriptions: response.active_subscriptions.length,
        payments: response.payment_records.length,
        invoices: response.invoices.length,
        renewals: response.upcoming_renewals.length
      }
    });

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`
      },
      status: 200,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    log('error', 'Request failed', { 
      requestId, 
      duration,
      error: errorMessage,
      stack: errorStack
    });

    // Determine appropriate status code
    let statusCode = 500;
    let userMessage = 'Internal server error';

    if (errorMessage.includes('configuration')) {
      statusCode = 503;
      userMessage = 'Service temporarily unavailable';
    } else if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
      statusCode = 401;
      userMessage = 'Authentication required';
    } else if (errorMessage.includes('not found')) {
      statusCode = 404;
      userMessage = 'Resource not found';
    }

    return new Response(JSON.stringify({ 
      error: userMessage,
      message: errorMessage,
      requestId,
      timestamp: new Date().toISOString()
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Request-ID': requestId 
      },
      status: statusCode,
    });
  }
});
