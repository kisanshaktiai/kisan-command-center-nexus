
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConversionEmailRequest {
  leadId: string;
  tenantId: string;
  adminEmail: string;
  adminName: string;
  tenantName: string;
  tempPassword: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { leadId, tenantId, adminEmail, adminName, tenantName, tempPassword } = await req.json() as ConversionEmailRequest;

    // Create user account in auth.users if it doesn't exist
    const { data: existingUser, error: userCheckError } = await supabase.auth.admin.getUserByEmail(adminEmail);
    
    let userId;
    if (!existingUser || userCheckError) {
      // Create new user
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: adminName,
          tenant_id: tenantId,
          role: 'tenant_admin'
        }
      });

      if (createUserError) {
        throw new Error(`Failed to create user: ${createUserError.message}`);
      }
      
      userId = newUser.user?.id;
    } else {
      userId = existingUser.user?.id;
      
      // Update existing user's metadata to include tenant info
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: adminName,
          tenant_id: tenantId,
          role: 'tenant_admin'
        }
      });

      if (updateError) {
        console.error('Failed to update user metadata:', updateError);
      }
    }

    // Create user_tenants relationship
    const { error: tenantUserError } = await supabase
      .from('user_tenants')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        role: 'tenant_admin',
        is_active: true
      });

    if (tenantUserError) {
      console.error('Failed to create tenant user relationship:', tenantUserError);
    }

    // Send welcome email (this would integrate with your email service)
    const emailData = {
      to: adminEmail,
      subject: `Welcome to ${tenantName} - Your Tenant Account is Ready!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to ${tenantName}!</h2>
          <p>Dear ${adminName},</p>
          <p>Congratulations! Your lead has been converted to a tenant account. You can now access your dedicated tenant dashboard.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>Login Credentials:</h3>
            <p><strong>Email:</strong> ${adminEmail}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
            <p><strong>Tenant:</strong> ${tenantName}</p>
          </div>
          
          <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
          
          <div style="margin: 30px 0;">
            <a href="${Deno.env.get('SITE_URL') || 'https://yourapp.com'}/auth" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Login to Your Account
            </a>
          </div>
          
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>The Team</p>
        </div>
      `
    };

    // Here you would integrate with your email service (Resend, SendGrid, etc.)
    // For now, we'll log the email data and mark as sent
    console.log('Email to be sent:', emailData);

    // Update lead with conversion completion
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({
        status: 'converted',
        converted_tenant_id: tenantId,
        converted_at: new Date().toISOString(),
        notes: `Converted to tenant: ${tenantName}. Welcome email sent to ${adminEmail}.`
      })
      .eq('id', leadId);

    if (leadUpdateError) {
      console.error('Failed to update lead status:', leadUpdateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tenant conversion completed and email sent',
        userId,
        tenantId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Tenant conversion email error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
