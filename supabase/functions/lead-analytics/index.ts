
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyticsRequest {
  type: 'conversion_funnel' | 'lead_performance' | 'source_effectiveness' | 'team_performance';
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { type, dateRange, filters } = await req.json() as AnalyticsRequest;

    switch (type) {
      case 'conversion_funnel':
        return await getConversionFunnel(supabase, dateRange);
      
      case 'lead_performance':
        return await getLeadPerformance(supabase, dateRange, filters);
      
      case 'source_effectiveness':
        return await getSourceEffectiveness(supabase, dateRange);
      
      case 'team_performance':
        return await getTeamPerformance(supabase, dateRange);
      
      default:
        throw new Error('Invalid analytics type');
    }
  } catch (error) {
    console.error('Analytics error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getConversionFunnel(supabase: any, dateRange?: any) {
  const query = supabase
    .from('leads')
    .select('status, created_at');

  if (dateRange) {
    query.gte('created_at', dateRange.start)
         .lte('created_at', dateRange.end);
  }

  const { data: leads } = await query;

  const funnel = {
    new: leads?.filter(l => l.status === 'new').length || 0,
    assigned: leads?.filter(l => l.status === 'assigned').length || 0,
    contacted: leads?.filter(l => l.status === 'contacted').length || 0,
    qualified: leads?.filter(l => l.status === 'qualified').length || 0,
    converted: leads?.filter(l => l.status === 'converted').length || 0,
    rejected: leads?.filter(l => l.status === 'rejected').length || 0,
  };

  const total = leads?.length || 0;
  const conversions = {
    new_to_assigned: total > 0 ? (funnel.assigned / total) * 100 : 0,
    assigned_to_contacted: funnel.assigned > 0 ? (funnel.contacted / funnel.assigned) * 100 : 0,
    contacted_to_qualified: funnel.contacted > 0 ? (funnel.qualified / funnel.contacted) * 100 : 0,
    qualified_to_converted: funnel.qualified > 0 ? (funnel.converted / funnel.qualified) * 100 : 0,
  };

  return new Response(
    JSON.stringify({ funnel, conversions, total }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getLeadPerformance(supabase: any, dateRange?: any, filters?: any) {
  let query = supabase
    .from('leads')
    .select('*, lead_activities(*)');

  if (dateRange) {
    query = query.gte('created_at', dateRange.start)
                 .lte('created_at', dateRange.end);
  }

  const { data: leads } = await query;

  const performance = {
    totalLeads: leads?.length || 0,
    avgScore: leads?.reduce((sum, lead) => sum + (lead.lead_score || 0), 0) / (leads?.length || 1),
    avgTimeToContact: calculateAvgTimeToContact(leads || []),
    avgTimeToConversion: calculateAvgTimeToConversion(leads || []),
    topPerformers: getTopPerformingLeads(leads || []),
  };

  return new Response(
    JSON.stringify(performance),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getSourceEffectiveness(supabase: any, dateRange?: any) {
  let query = supabase
    .from('leads')
    .select('source, status, qualification_score');

  if (dateRange) {
    query = query.gte('created_at', dateRange.start)
                 .lte('created_at', dateRange.end);
  }

  const { data: leads } = await query;

  const sourceStats = {};
  
  leads?.forEach(lead => {
    const source = lead.source || 'unknown';
    if (!sourceStats[source]) {
      sourceStats[source] = {
        total: 0,
        converted: 0,
        avgScore: 0,
        totalScore: 0
      };
    }
    
    sourceStats[source].total++;
    sourceStats[source].totalScore += lead.qualification_score || 0;
    
    if (lead.status === 'converted') {
      sourceStats[source].converted++;
    }
  });

  // Calculate averages and conversion rates
  Object.keys(sourceStats).forEach(source => {
    const stats = sourceStats[source];
    stats.avgScore = stats.totalScore / stats.total;
    stats.conversionRate = (stats.converted / stats.total) * 100;
    delete stats.totalScore; // Remove intermediate calculation
  });

  return new Response(
    JSON.stringify(sourceStats),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getTeamPerformance(supabase: any, dateRange?: any) {
  let query = supabase
    .from('leads')
    .select('assigned_to, status, qualification_score, assigned_at, converted_at');

  if (dateRange) {
    query = query.gte('created_at', dateRange.start)
                 .lte('created_at', dateRange.end);
  }

  const { data: leads } = await query;

  // Get admin users
  const { data: admins } = await supabase
    .from('admin_users')
    .select('id, full_name, email');

  const teamStats = {};

  admins?.forEach(admin => {
    teamStats[admin.id] = {
      name: admin.full_name || admin.email,
      totalLeads: 0,
      converted: 0,
      avgScore: 0,
      totalScore: 0,
      avgTimeToConversion: 0
    };
  });

  leads?.forEach(lead => {
    if (lead.assigned_to && teamStats[lead.assigned_to]) {
      const stats = teamStats[lead.assigned_to];
      stats.totalLeads++;
      stats.totalScore += lead.qualification_score || 0;
      
      if (lead.status === 'converted') {
        stats.converted++;
      }
    }
  });

  // Calculate averages
  Object.keys(teamStats).forEach(adminId => {
    const stats = teamStats[adminId];
    if (stats.totalLeads > 0) {
      stats.avgScore = stats.totalScore / stats.totalLeads;
      stats.conversionRate = (stats.converted / stats.totalLeads) * 100;
    }
    delete stats.totalScore;
  });

  return new Response(
    JSON.stringify(teamStats),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function calculateAvgTimeToContact(leads: any[]): number {
  const contactedLeads = leads.filter(lead => 
    lead.status !== 'new' && lead.last_contact_at && lead.created_at
  );
  
  if (contactedLeads.length === 0) return 0;
  
  const totalTime = contactedLeads.reduce((sum, lead) => {
    const created = new Date(lead.created_at).getTime();
    const contacted = new Date(lead.last_contact_at).getTime();
    return sum + (contacted - created);
  }, 0);
  
  return totalTime / contactedLeads.length / (1000 * 60 * 60); // Convert to hours
}

function calculateAvgTimeToConversion(leads: any[]): number {
  const convertedLeads = leads.filter(lead => 
    lead.status === 'converted' && lead.converted_at && lead.created_at
  );
  
  if (convertedLeads.length === 0) return 0;
  
  const totalTime = convertedLeads.reduce((sum, lead) => {
    const created = new Date(lead.created_at).getTime();
    const converted = new Date(lead.converted_at).getTime();
    return sum + (converted - created);
  }, 0);
  
  return totalTime / convertedLeads.length / (1000 * 60 * 60 * 24); // Convert to days
}

function getTopPerformingLeads(leads: any[]): any[] {
  return leads
    .sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0))
    .slice(0, 5)
    .map(lead => ({
      id: lead.id,
      name: lead.contact_name,
      organization: lead.organization_name,
      score: lead.lead_score,
      status: lead.status
    }));
}
