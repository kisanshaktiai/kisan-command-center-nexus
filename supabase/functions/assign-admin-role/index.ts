
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting store (in-memory for simplicity)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

const checkRateLimit = (identifier: string, maxRequests = 5, windowMs = 60000): boolean => {
  const now = Date.now()
  const key = `rate_limit:${identifier}`
  
  let bucket = rateLimitStore.get(key)
  
  if (!bucket || now > bucket.resetTime) {
    bucket = { count: 0, resetTime: now + windowMs }
    rateLimitStore.set(key, bucket)
  }
  
  if (bucket.count >= maxRequests) {
    return false
  }
  
  bucket.count++
  return true
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Assign admin role function called')
    
    // Rate limiting by IP
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    
    if (!checkRateLimit(clientIP)) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`)
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '60'
          } 
        }
      )
    }
    
    // Use service role key for admin operations
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

    // Validate required fields
    if (!userId || !email || !fullName || !role) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          code: 'MISSING_FIELDS',
          details: { userId: !!userId, email: !!email, fullName: !!fullName, role: !!role }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate the role - updated to use correct enum values
    const validRoles = ['super_admin', 'platform_admin', 'admin']
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid role specified',
          code: 'INVALID_ROLE',
          validRoles: validRoles
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user already exists in admin_users (with deduplication)
    const { data: existingAdmin, error: checkError } = await supabaseAdmin
      .from('admin_users')
      .select('id, role, is_active')
      .eq('id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing admin:', checkError)
      return new Response(
        JSON.stringify({ 
          error: `Database error: ${checkError.message}`,
          code: 'DATABASE_ERROR'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (existingAdmin) {
      console.log('User already has admin role:', existingAdmin)
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'User already has admin role assigned',
          code: 'ALREADY_ADMIN',
          data: existingAdmin
        }),
        { 
          status: 200, 
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
      
      // Handle duplicate key error
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'User already has admin role assigned',
            code: 'ALREADY_ADMIN'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Failed to assign admin role: ${insertError.message}`,
          code: 'INSERT_FAILED',
          details: insertError
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the admin creation - use try/catch to not block the main flow
    try {
      await supabaseAdmin.rpc('log_security_event', {
        event_type: 'admin_user_created',
        user_id: userId,
        tenant_id: null,
        metadata: {
          role: role,
          email: email,
          full_name: fullName,
          timestamp: new Date().toISOString(),
          ip_address: clientIP
        },
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || 'admin_registration'
      })
    } catch (logError) {
      console.error('Failed to log security event:', logError)
      // Continue execution - logging failure shouldn't block registration
    }

    console.log('Admin role assigned successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Admin role assigned successfully',
        user_id: userId,
        role: role,
        code: 'SUCCESS'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
