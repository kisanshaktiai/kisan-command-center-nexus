
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LeadProcessingRequest {
  action: 'auto_assign' | 'calculate_score' | 'detect_duplicates' | 'enrich_data';
  leadId?: string;
  leadData?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, leadId, leadData } = await req.json() as LeadProcessingRequest;

    switch (action) {
      case 'auto_assign':
        return await autoAssignLead(supabase, leadId);
      
      case 'calculate_score':
        return await calculateLeadScore(supabase, leadId);
      
      case 'detect_duplicates':
        return await detectDuplicates(supabase, leadData);
      
      case 'enrich_data':
        return await enrichLeadData(supabase, leadId);
      
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Lead processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function autoAssignLead(supabase: any, leadId: string) {
  // Get active assignment rules
  const { data: rules } = await supabase
    .from('lead_assignment_rules')
    .select('*')
    .eq('is_active', true)
    .order('priority_order', { ascending: true });

  if (!rules || rules.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No active assignment rules found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Simple round-robin assignment for now
  const rule = rules[0];
  const adminPool = rule.admin_pool || [];
  
  if (adminPool.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No admins in assignment pool' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get assignment count for today to implement round-robin
  const { count } = await supabase
    .from('lead_assignments')
    .select('*', { count: 'exact' })
    .gte('assigned_at', new Date().toISOString().split('T')[0]);

  const assignedAdminId = adminPool[(count || 0) % adminPool.length];

  // Update lead assignment
  const { error } = await supabase
    .from('leads')
    .update({
      assigned_to: assignedAdminId,
      assigned_at: new Date().toISOString(),
      status: 'assigned',
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId);

  if (error) throw error;

  // Log assignment
  await supabase
    .from('lead_assignments')
    .insert({
      lead_id: leadId,
      assigned_to: assignedAdminId,
      assignment_type: 'auto',
      assignment_reason: `Auto-assigned via rule: ${rule.rule_name}`,
      assigned_at: new Date().toISOString()
    });

  return new Response(
    JSON.stringify({ message: 'Lead auto-assigned successfully', assignedTo: assignedAdminId }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function calculateLeadScore(supabase: any, leadId: string) {
  const { data, error } = await supabase.rpc('calculate_lead_score', { lead_id: leadId });
  
  if (error) throw error;

  return new Response(
    JSON.stringify({ score: data, message: 'Lead score calculated successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function detectDuplicates(supabase: any, leadData: any) {
  const { data: duplicates } = await supabase
    .from('leads')
    .select('id, contact_name, email, organization_name')
    .or(`email.eq.${leadData.email},and(contact_name.eq.${leadData.contact_name},organization_name.eq.${leadData.organization_name})`);

  return new Response(
    JSON.stringify({ duplicates: duplicates || [], count: duplicates?.length || 0 }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function enrichLeadData(supabase: any, leadId: string) {
  // Get lead data
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (!lead) {
    throw new Error('Lead not found');
  }

  // Simple data enrichment (in production, this would call external APIs)
  const enrichedData = {
    lead_temperature: lead.priority === 'high' ? 'hot' : lead.priority === 'medium' ? 'warm' : 'cold',
    marketing_qualified: lead.qualification_score > 30,
    sales_qualified: lead.qualification_score > 60
  };

  // Update lead with enriched data
  const { error } = await supabase
    .from('leads')
    .update({
      ...enrichedData,
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ message: 'Lead data enriched successfully', enrichedData }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
