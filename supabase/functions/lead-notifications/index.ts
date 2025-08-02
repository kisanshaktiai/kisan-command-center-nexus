
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  type: 'new_lead' | 'follow_up_reminder' | 'sla_breach' | 'assignment_notification';
  leadId: string;
  recipientId?: string;
  metadata?: any;
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

    const { type, leadId, recipientId, metadata } = await req.json() as NotificationRequest;

    // Get lead data
    const { data: lead } = await supabase
      .from('leads')
      .select('*, assigned_admin:admin_users(full_name, email)')
      .eq('id', leadId)
      .single();

    if (!lead) {
      throw new Error('Lead not found');
    }

    switch (type) {
      case 'new_lead':
        return await sendNewLeadNotification(supabase, lead);
      
      case 'follow_up_reminder':
        return await sendFollowUpReminder(supabase, lead, recipientId);
      
      case 'sla_breach':
        return await sendSLABreachAlert(supabase, lead, metadata);
      
      case 'assignment_notification':
        return await sendAssignmentNotification(supabase, lead);
      
      default:
        throw new Error('Invalid notification type');
    }
  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendNewLeadNotification(supabase: any, lead: any) {
  // Get all active super admins
  const { data: superAdmins } = await supabase
    .from('admin_users')
    .select('id, full_name, email')
    .eq('role', 'super_admin')
    .eq('is_active', true);

  const notifications = superAdmins?.map(admin => ({
    recipient_id: admin.id,
    title: 'New Lead Received',
    message: `A new lead "${lead.contact_name}" from ${lead.organization_name || 'Unknown Organization'} has been received.`,
    type: 'info',
    priority: 'normal',
    metadata: {
      lead_id: lead.id,
      lead_name: lead.contact_name,
      organization: lead.organization_name,
      source: lead.source
    }
  })) || [];

  if (notifications.length > 0) {
    const { error } = await supabase
      .from('admin_notifications')
      .insert(notifications);

    if (error) throw error;
  }

  return new Response(
    JSON.stringify({ message: 'New lead notifications sent', count: notifications.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendFollowUpReminder(supabase: any, lead: any, recipientId?: string) {
  const recipient = recipientId || lead.assigned_to;
  
  if (!recipient) {
    throw new Error('No recipient specified for follow-up reminder');
  }

  const notification = {
    recipient_id: recipient,
    title: 'Follow-up Reminder',
    message: `Follow-up required for lead "${lead.contact_name}" from ${lead.organization_name || 'Unknown Organization'}.`,
    type: 'warning',
    priority: 'high',
    metadata: {
      lead_id: lead.id,
      lead_name: lead.contact_name,
      organization: lead.organization_name,
      last_activity: lead.last_activity,
      next_follow_up: lead.next_follow_up_at
    }
  };

  const { error } = await supabase
    .from('admin_notifications')
    .insert(notification);

  if (error) throw error;

  return new Response(
    JSON.stringify({ message: 'Follow-up reminder sent' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendSLABreachAlert(supabase: any, lead: any, metadata: any) {
  // Get super admins and the assigned admin
  const { data: admins } = await supabase
    .from('admin_users')
    .select('id, full_name, email, role')
    .in('role', ['super_admin', 'platform_admin'])
    .eq('is_active', true);

  const notifications = admins?.map(admin => ({
    recipient_id: admin.id,
    title: 'SLA Breach Alert',
    message: `Lead "${lead.contact_name}" has breached SLA requirements. ${metadata?.breach_type || 'Response time exceeded'}.`,
    type: 'error',
    priority: 'urgent',
    metadata: {
      lead_id: lead.id,
      lead_name: lead.contact_name,
      organization: lead.organization_name,
      assigned_to: lead.assigned_to,
      breach_type: metadata?.breach_type,
      breach_time: new Date().toISOString()
    }
  })) || [];

  if (notifications.length > 0) {
    const { error } = await supabase
      .from('admin_notifications')
      .insert(notifications);

    if (error) throw error;
  }

  return new Response(
    JSON.stringify({ message: 'SLA breach alerts sent', count: notifications.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendAssignmentNotification(supabase: any, lead: any) {
  if (!lead.assigned_to) {
    throw new Error('Lead is not assigned to anyone');
  }

  const notification = {
    recipient_id: lead.assigned_to,
    title: 'New Lead Assignment',
    message: `You have been assigned a new lead: "${lead.contact_name}" from ${lead.organization_name || 'Unknown Organization'}.`,
    type: 'info',
    priority: 'normal',
    metadata: {
      lead_id: lead.id,
      lead_name: lead.contact_name,
      organization: lead.organization_name,
      priority: lead.priority,
      source: lead.source,
      assigned_at: lead.assigned_at
    }
  };

  const { error } = await supabase
    .from('admin_notifications')
    .insert(notification);

  if (error) throw error;

  return new Response(
    JSON.stringify({ message: 'Assignment notification sent' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
