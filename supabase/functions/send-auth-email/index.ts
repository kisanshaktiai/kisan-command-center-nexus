import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  type: 'signup' | 'recovery' | 'magiclink' | 'email_change' | 'invite' | 'admin_invite' | 'user_invite' | 'tenant_admin_invite';
  email: string;
  redirectTo?: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured. Please add it in Secrets.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);
    
    const requestData: AuthEmailRequest = await req.json();
    const { type, email, redirectTo, userId, tenantId, metadata } = requestData;

    console.log('Processing auth email:', { type, email, tenantId });

    // Fetch white-label config if tenantId provided
    let brandConfig: any = null;
    if (tenantId) {
      const { data: whiteLabelConfig } = await supabase
        .from('white_label_configs')
        .select('brand_identity, email_templates')
        .eq('tenant_id', tenantId)
        .single();
      
      if (whiteLabelConfig) {
        brandConfig = whiteLabelConfig;
      }
    }

    // Map auth email types to template types
    const templateTypeMap: Record<string, string> = {
      'signup': 'email_verification',
      'recovery': 'password_reset',
      'magiclink': 'magic_link',
      'email_change': 'email_change',
      'invite': 'user_invite',
      'admin_invite': 'admin_invite',
      'user_invite': 'user_invite',
      'tenant_admin_invite': 'tenant_admin_invite'
    };
    
    const templateType = templateTypeMap[type] || 'email_verification';

    // Fetch email template from database
    let template: any = null;
    
    // Try tenant-specific template first
    if (tenantId) {
      const { data: tenantTemplate } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_type', templateType)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (tenantTemplate) {
        template = tenantTemplate;
      }
    }
    
    // Fall back to default template
    if (!template) {
      const { data: defaultTemplate } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_type', templateType)
        .is('tenant_id', null)
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle();
      
      if (defaultTemplate) {
        template = defaultTemplate;
      }
    }

    // If no template found, return error
    if (!template) {
      throw new Error(`No email template found for type: ${templateType}`);
    }

    // Build variables for template rendering
    const appName = brandConfig?.brand_identity?.app_name || metadata?.app_name || 'KisanShaktiAI';
    const companyName = brandConfig?.brand_identity?.company_name || metadata?.company_name || 'KisanShaktiAI';
    const primaryColor = brandConfig?.brand_identity?.primary_color || metadata?.primary_color || '#6366f1';
    
    const variables: Record<string, string> = {
      app_name: appName,
      company_name: companyName,
      primary_color: primaryColor,
      user_name: metadata?.user_name || email.split('@')[0],
      email: email,
      invite_url: metadata?.invite_url || redirectTo || '',
      role: metadata?.role || 'User',
      organization_name: metadata?.organization_name || companyName,
      tenant_name: metadata?.tenant_name || companyName,
      inviter_name: metadata?.inviter_name || 'Team Admin',
      verification_url: redirectTo || `${supabaseUrl}/auth/verify`,
      reset_url: redirectTo || `${supabaseUrl}/auth/reset-password`,
      magic_link_url: redirectTo || `${supabaseUrl}/auth/verify`,
      reset_code: metadata?.reset_code || '',
      support_email: metadata?.support_email || 'support@kisanshaktiai.in',
      app_url: redirectTo || supabaseUrl
    };

    // Render template
    const renderTemplate = (templateStr: string): string => {
      let result = templateStr;
      Object.entries(variables).forEach(([key, value]) => {
        const regex1 = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        const regex2 = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(regex1, value);
        result = result.replace(regex2, value);
      });
      return result;
    };

    const subject = renderTemplate(template.subject_template);
    const htmlContent = renderTemplate(template.html_template);
    const textContent = template.text_template ? renderTemplate(template.text_template) : undefined;

    // Log email sending attempt
    const { data: logData } = await supabase
      .from('email_logs')
      .insert({
        tenant_id: tenantId,
        recipient_email: email,
        recipient_id: userId,
        template_id: template.id,
        template_type: templateType,
        subject,
        status: 'pending',
        metadata: { auth_type: type, ...metadata },
        retry_count: 0
      })
      .select()
      .single();

    // Send email via Resend
    // Use a safe display name without special characters to avoid domain verification issues
    const safeCompanyName = companyName.replace(/[<>@]/g, '').trim() || 'KisanShaktiAI';
    const emailResponse = await resend.emails.send({
      from: `${safeCompanyName} <onboarding@resend.dev>`,
      to: [email],
      subject,
      html: htmlContent,
      text: textContent
    });

    // Update log status
    if (logData) {
      await supabase
        .from('email_logs')
        .update({
          status: 'sent',
          external_message_id: emailResponse.data?.id,
          sent_at: new Date().toISOString()
        })
        .eq('id', logData.id);
    }

    console.log('Auth email sent successfully:', { messageId: emailResponse.data?.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
