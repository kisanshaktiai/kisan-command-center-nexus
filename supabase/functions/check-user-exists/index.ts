
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCors } from '../_shared/cors.ts'
import { handleError } from '../_shared/errorHandler.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Get CORS headers for this specific request
  const corsHeaders = getCorsHeaders(req);

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user exists in auth.users
    const { data: authUsers, error: authError } = await supabaseServiceRole.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return new Response(
        JSON.stringify({ error: 'Failed to check user existence' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userExists = authUsers.users.some(user => user.email === email)

    if (!userExists) {
      return new Response(
        JSON.stringify({ exists: false }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the user by email
    const existingUser = authUsers.users.find(user => user.email === email)
    
    if (!existingUser) {
      return new Response(
        JSON.stringify({ exists: false }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user is an admin
    const { data: adminData, error: adminError } = await supabaseServiceRole
      .from('admin_users')
      .select('*')
      .eq('id', existingUser.id)
      .single()

    const isAdmin = !adminError && adminData

    return new Response(
      JSON.stringify({ 
        exists: true, 
        isAdmin,
        userId: existingUser.id,
        userStatus: existingUser.email_confirmed_at ? 'confirmed' : 'pending'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in check-user-exists function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
