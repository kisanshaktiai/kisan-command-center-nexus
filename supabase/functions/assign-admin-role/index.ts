
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Assign admin role function called')
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { userId, email, fullName, role } = await req.json()
    
    console.log('Assigning role:', role, 'to user:', userId)

    // Validate the role
    const validRoles = ['super_admin', 'platform_admin', 'admin']
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role specified' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Insert into admin_users table
    const { error: insertError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        role: role,
        is_active: true
      })

    if (insertError) {
      console.error('Error inserting admin user:', insertError)
      
      return new Response(
        JSON.stringify({ error: `Failed to assign admin role: ${insertError.message}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the admin creation
    await supabaseAdmin.rpc('log_security_event', {
      event_type: 'admin_user_created',
      user_id: userId,
      tenant_id: null,
      metadata: {
        role: role,
        email: email,
        full_name: fullName,
        timestamp: new Date().toISOString()
      },
      ip_address: 'edge_function',
      user_agent: 'admin_registration'
    })

    console.log('Admin role assigned successfully')

    return new Response(
      JSON.stringify({ 
        message: 'Admin role assigned successfully',
        user_id: userId,
        role: role
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
