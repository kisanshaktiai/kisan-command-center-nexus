
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'activation' | 'invite' | 'password_reset' | 'notification';
  tenantId: string;
  recipientEmail: string;
  recipientName: string;
  templateData: Record<string, any>;
  invitationToken?: string;
  leadId?: string;
}

interface TenantBranding {
  tenant_name: string;
  tenant_logo?: string;
  primary_color: string;
  secondary_color: string;
  support_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }
    const resend = new Resend(resendApiKey);

    const emailRequest: EmailRequest = await req.json();
    const { type, tenantId, recipientEmail, recipientName, templateData, invitationToken, leadId } = emailRequest;

    console.log(`Processing ${type} email for ${recipientEmail} (tenant: ${tenantId})`);

    // Get tenant branding information
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, owner_email, metadata')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error('Failed to fetch tenant:', tenantError);
      throw new Error('Tenant not found');
    }

    // Extract branding from tenant metadata
    const branding: TenantBranding = {
      tenant_name: tenant.name,
      tenant_logo: tenant.metadata?.branding?.logo_url,
      primary_color: tenant.metadata?.branding?.primary_color || '#2563eb',
      secondary_color: tenant.metadata?.branding?.secondary_color || '#1d4ed8',
      support_email: tenant.metadata?.support_email || tenant.owner_email || 'support@kisanshakti.in'
    };

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_type', type)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .eq('is_active', true)
      .order('tenant_id', { ascending: false, nullsLast: false })
      .limit(1)
      .single();

    if (templateError || !template) {
      console.error('Failed to fetch template:', templateError);
      throw new Error(`Email template for type '${type}' not found`);
    }

    // Prepare template variables
    const templateVariables = {
      user_name: recipientName,
      current_year: new Date().getFullYear().toString(),
      ...branding,
      ...templateData
    };

    // Process template content
    const processTemplate = (content: string, variables: Record<string, any>): string => {
      let processedContent = content;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedContent = processedContent.replace(regex, value || '');
      }
      
      // Handle conditional blocks like {{#if tenant_logo}}
      processedContent = processedContent.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
        return variables[variable] ? content : '';
      });
      
      return processedContent;
    };

    const subject = processTemplate(template.subject, templateVariables);
    const htmlContent = processTemplate(template.html_content, templateVariables);
    const textContent = template.text_content ? processTemplate(template.text_content, templateVariables) : undefined;

    // Send email using Resend
    const emailData = {
      from: `${template.sender_name} <${template.sender_email}>`,
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
      ...(textContent && { text: textContent })
    };

    const { data: emailResult, error: emailError } = await resend.emails.send(emailData);

    if (emailError) {
      console.error('Failed to send email:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    // Log the email
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        tenant_id: tenantId,
        recipient_email: recipientEmail,
        sender_email: template.sender_email,
        template_type: type,
        subject: subject,
        status: 'sent',
        external_id: emailResult?.id,
        sent_at: new Date().toISOString(),
        metadata: {
          template_id: template.id,
          invitation_token: invitationToken,
          lead_id: leadId,
          resend_id: emailResult?.id
        }
      });

    if (logError) {
      console.error('Failed to log email:', logError);
    }

    // Update invitation status if applicable
    if (invitationToken) {
      const { error: inviteError } = await supabase
        .from('user_invitations')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('invitation_token', invitationToken);

      if (inviteError) {
        console.error('Failed to update invitation status:', inviteError);
      }
    }

    console.log(`Successfully sent ${type} email to ${recipientEmail}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully',
      email_id: emailResult?.id
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error sending email:", error);
    
    return new Response(JSON.stringify({
      error: error.message || "Failed to send email"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
