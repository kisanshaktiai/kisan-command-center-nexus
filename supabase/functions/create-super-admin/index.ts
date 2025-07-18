
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
    console.log('Create super admin function called')
    
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

    const { email, password, fullName } = await req.json()
    
    console.log('Attempting to create user:', email)

    // Create the user using the admin client
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName
      }
    })

    if (userError) {
      console.error('Error creating user:', userError)
      return new Response(
        JSON.stringify({ error: userError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('User created successfully:', user.user?.id)

    // Insert into admin_users table
    const { error: insertError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        id: user.user!.id,
        email: email,
        full_name: fullName,
        role: 'super_admin',
        is_active: true,
        created_by: user.user!.id // Self-created
      })

    if (insertError) {
      console.error('Error inserting admin user:', insertError)
      // Try to clean up the auth user if admin insertion fails
      await supabaseAdmin.auth.admin.deleteUser(user.user!.id)
      
      return new Response(
        JSON.stringify({ error: `Failed to create admin record: ${insertError.message}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Super admin created successfully')

    return new Response(
      JSON.stringify({ 
        message: 'Super admin created successfully',
        user_id: user.user!.id,
        email: email
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
