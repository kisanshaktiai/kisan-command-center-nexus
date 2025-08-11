
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Create service role client
    const supabaseServiceUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Check if user exists in auth.users using the admin API
    const { data: { users }, error } = await fetch(
      `${supabaseServiceUrl}/auth/v1/admin/users`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey
        }
      }
    ).then(res => res.json())

    if (error) {
      console.error('Error fetching users:', error)
      return new Response(
        JSON.stringify({ 
          userExists: false, 
          user: null,
          error: 'Failed to check user existence' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Find user by email
    const existingUser = users?.find((user: any) => user.email === email)

    return new Response(
      JSON.stringify({
        userExists: !!existingUser,
        user: existingUser ? {
          id: existingUser.id,
          email: existingUser.email,
          created_at: existingUser.created_at
        } : null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in check-user-exists function:', error)
    return new Response(
      JSON.stringify({ 
        userExists: false, 
        user: null,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
