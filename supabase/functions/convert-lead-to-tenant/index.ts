
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConvertLeadRequest {
  leadId: string;
  tenantName: string;
  tenantSlug: string;
  subscriptionPlan?: string;
  adminEmail?: string;
  adminName?: string;
}

interface ConversionResult {
  success: boolean;
  tenant_id?: string;
  tempPassword?: string;
  message?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate request method
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Convert lead to tenant function started');

  try {
    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse and validate request body
    let requestBody: ConvertLeadRequest;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      leadId, 
      tenantName, 
      tenantSlug, 
      subscriptionPlan = 'Kisan_Basic', 
      adminEmail, 
      adminName 
    } = requestBody;

    // Validate required fields
    if (!leadId || !tenantName || !tenantSlug) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: leadId, tenantName, and tenantSlug are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Converting lead to tenant:', { 
      leadId, 
      tenantName, 
      tenantSlug, 
      subscriptionPlan,
      adminEmail: adminEmail ? '[PROVIDED]' : '[NOT PROVIDED]'
    });

    // Step 1: Get and validate the lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !leadData) {
      console.error('Lead not found or error fetching lead:', leadError);
      return new Response(
        JSON.stringify({ 
          error: leadError?.code === 'PGRST116' 
            ? 'Lead not found' 
            : 'Failed to fetch lead details'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate lead status
    if (leadData.status !== 'qualified') {
      console.log('Lead status check failed:', leadData.status);
      return new Response(
        JSON.stringify({ 
          error: `Lead must be in 'qualified' status to convert. Current status: ${leadData.status}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Check slug availability
    const { data: existingTenant, error: slugCheckError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle();

    if (slugCheckError) {
      console.error('Error checking slug availability:', slugCheckError);
      return new Response(
        JSON.stringify({ error: 'Failed to validate tenant slug' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingTenant) {
      return new Response(
        JSON.stringify({ error: 'This slug is already taken' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Create the tenant
    const tenantData = {
      name: tenantName,
      slug: tenantSlug,
      type: 'agri_company',
      status: 'trial',
      subscription_plan: subscriptionPlan,
      owner_name: adminName || leadData.contact_name,
      owner_email: adminEmail || leadData.email,
      owner_phone: leadData.phone,
      metadata: {
        converted_from_lead: leadId,
        conversion_date: new Date().toISOString(),
        lead_source: leadData.source,
        lead_priority: leadData.priority
      }
    };

    console.log('Creating tenant with data:', { 
      ...tenantData, 
      metadata: '[OBJECT]' 
    });

    const { data: newTenant, error: tenantError } = await supabase
      .from('tenants')
      .insert(tenantData)
      .select()
      .single();

    if (tenantError || !newTenant) {
      console.error('Failed to create tenant:', tenantError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create tenant',
          details: tenantError?.message || 'Unknown error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tenant created successfully:', newTenant.id);

    // Step 4: Generate temporary password for admin user
    const tempPassword = generateSecurePassword();
    const adminEmailAddress = adminEmail || leadData.email;

    let userId: string | null = null;

    // Step 5: Create or update admin user
    try {
      console.log('Creating admin user for email:', adminEmailAddress);

      // Check if user already exists
      const { data: existingUsers, error: userSearchError } = await supabase.auth.admin.listUsers();
      
      if (userSearchError) {
        console.warn('Could not search for existing users:', userSearchError);
      }

      const existingUser = existingUsers?.users?.find(u => u.email === adminEmailAddress);
      
      if (existingUser) {
        console.log('Found existing user, updating metadata');
        userId = existingUser.id;
        
        // Update existing user's metadata
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            full_name: adminName || leadData.contact_name,
            tenant_id: newTenant.id,
            role: 'tenant_admin',
            converted_from_lead: leadId
          }
        });

        if (updateError) {
          console.error('Failed to update existing user metadata:', updateError);
        }
      } else {
        console.log('Creating new user');
        
        // Create new user
        const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
          email: adminEmailAddress,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: adminName || leadData.contact_name,
            tenant_id: newTenant.id,
            role: 'tenant_admin',
            converted_from_lead: leadId
          }
        });

        if (createUserError) {
          console.error('Failed to create user:', createUserError);
          // Continue without user creation - tenant is already created
        } else {
          userId = newUser.user?.id || null;
          console.log('User created successfully:', userId);
        }
      }

      // Step 6: Create user_tenants relationship if user was created/found
      if (userId) {
        const { error: tenantUserError } = await supabase
          .from('user_tenants')
          .upsert({
            user_id: userId,
            tenant_id: newTenant.id,
            role: 'tenant_admin',
            is_active: true
          }, {
            onConflict: 'user_id,tenant_id'
          });

        if (tenantUserError) {
          console.error('Failed to create/update tenant user relationship:', tenantUserError);
        } else {
          console.log('User-tenant relationship created/updated successfully');
        }
      }

    } catch (authError) {
      console.warn('Auth operations failed, continuing without user creation:', authError);
      // We continue since the tenant was created successfully
    }

    // Step 7: Update the lead status to converted
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({
        status: 'converted',
        converted_tenant_id: newTenant.id,
        converted_at: new Date().toISOString(),
        notes: (leadData.notes || '') + `\n\nConverted to tenant: ${tenantName} on ${new Date().toISOString()}. Admin email: ${adminEmailAddress}.`
      })
      .eq('id', leadId);

    if (leadUpdateError) {
      console.error('Failed to update lead status:', leadUpdateError);
      // This is not critical - we continue
    } else {
      console.log('Lead status updated to converted');
    }

    // Step 8: Log the conversion for audit trail
    try {
      await supabase
        .from('admin_audit_logs')
        .insert({
          action: 'lead_converted_to_tenant',
          details: {
            lead_id: leadId,
            tenant_id: newTenant.id,
            tenant_name: tenantName,
            tenant_slug: tenantSlug,
            admin_email: adminEmailAddress,
            subscription_plan: subscriptionPlan
          }
        });
    } catch (auditError) {
      console.warn('Failed to log audit trail:', auditError);
      // Non-critical, continue
    }

    const result: ConversionResult = {
      success: true,
      tenant_id: newTenant.id,
      message: 'Lead converted to tenant successfully'
    };

    // Only include temp password if we created a new user
    if (userId && !existingUsers?.users?.find(u => u.email === adminEmailAddress)) {
      result.tempPassword = tempPassword;
    }

    console.log('Lead conversion completed successfully');

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error during lead conversion:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during conversion',
        details: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Generates a secure random password meeting standard requirements
 */
function generateSecurePassword(): string {
  const length = 16;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill remaining length with random characters from all categories
  const allChars = uppercase + lowercase + numbers + symbols;
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to randomize character positions
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
