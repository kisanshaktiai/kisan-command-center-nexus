import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bootstrap-token',
}

// Rate limiting storage (in-memory for this function)
const rateLimitMap = new Map<string, { attempts: number; lastAttempt: number }>()

// Constants for security
const MAX_ATTEMPTS_PER_IP = 3
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MIN_PASSWORD_LENGTH = 8
const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 254

// Input validation functions
function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' }
  }
  
  if (email.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: 'Email is too long' }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }
  
  return { valid: true }
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' }
  }
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }
  }
  
  // Check for at least one uppercase, one lowercase, one number
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' }
  }
  
  return { valid: true }
}

function validateFullName(fullName: string): { valid: boolean; error?: string } {
  if (!fullName || typeof fullName !== 'string') {
    return { valid: false, error: 'Full name is required' }
  }
  
  const trimmedName = fullName.trim()
  if (trimmedName.length < 2) {
    return { valid: false, error: 'Full name must be at least 2 characters' }
  }
  
  if (trimmedName.length > MAX_NAME_LENGTH) {
    return { valid: false, error: 'Full name is too long' }
  }
  
  // Basic name validation - letters, spaces, hyphens, apostrophes
  if (!/^[a-zA-Z\s\-']+$/.test(trimmedName)) {
    return { valid: false, error: 'Full name contains invalid characters' }
  }
  
  return { valid: true }
}

function getClientIP(req: Request): string {
  // Try multiple headers to get real IP
  const xRealIP = req.headers.get('x-real-ip')
  const xForwardedFor = req.headers.get('x-forwarded-for')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  
  return xRealIP || xForwardedFor?.split(',')[0] || cfConnectingIP || 'unknown'
}

function checkRateLimit(ip: string): { allowed: boolean; error?: string } {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  if (!record) {
    rateLimitMap.set(ip, { attempts: 1, lastAttempt: now })
    return { allowed: true }
  }
  
  // Reset counter if window has passed
  if (now - record.lastAttempt > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { attempts: 1, lastAttempt: now })
    return { allowed: true }
  }
  
  // Check if exceeded max attempts
  if (record.attempts >= MAX_ATTEMPTS_PER_IP) {
    return { 
      allowed: false, 
      error: `Too many bootstrap attempts. Please try again in ${Math.ceil((RATE_LIMIT_WINDOW_MS - (now - record.lastAttempt)) / 60000)} minutes.` 
    }
  }
  
  // Increment attempts
  record.attempts++
  record.lastAttempt = now
  
  return { allowed: true }
}

function generateCSRFToken(): string {
  return crypto.randomUUID() + '-' + Date.now()
}

function validateCSRFToken(token: string, req: Request): boolean {
  const headerToken = req.headers.get('x-bootstrap-token')
  if (!headerToken || headerToken !== token) {
    return false
  }
  
  // Check token format and age (tokens expire after 1 hour)
  const parts = token.split('-')
  if (parts.length !== 2) return false
  
  const timestamp = parseInt(parts[1])
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  
  return (now - timestamp) < oneHour
}

async function atomicBootstrapCheck(supabaseAdmin: any): Promise<{ canProceed: boolean; error?: string }> {
  try {
    console.log('Performing atomic bootstrap check...')
    
    // Start a transaction-like check
    const { data: configData, error: configError } = await supabaseAdmin
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'bootstrap_completed')
      .maybeSingle()
    
    if (configError) {
      console.error('Error checking bootstrap config:', configError)
      return { canProceed: false, error: 'Failed to verify bootstrap status' }
    }
    
    if (configData?.config_value === 'true') {
      console.log('Bootstrap already completed')
      return { canProceed: false, error: 'System has already been initialized' }
    }
    
    // Double-check by looking for existing super admins
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('role', 'super_admin')
      .eq('is_active', true)
      .limit(1)
    
    if (adminError) {
      console.error('Error checking existing admins:', adminError)
      return { canProceed: false, error: 'Failed to verify admin status' }
    }
    
    if (adminData && adminData.length > 0) {
      console.log('Super admin already exists')
      return { canProceed: false, error: 'Super admin already exists' }
    }
    
    console.log('Atomic check passed - bootstrap can proceed')
    return { canProceed: true }
    
  } catch (error) {
    console.error('Atomic bootstrap check failed:', error)
    return { canProceed: false, error: 'System verification failed' }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const clientIP = getClientIP(req)
  console.log(`Bootstrap request from IP: ${clientIP}`)

  try {
    // Rate limiting check
    const rateLimitCheck = checkRateLimit(clientIP)
    if (!rateLimitCheck.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`)
      return new Response(
        JSON.stringify({ error: rateLimitCheck.error }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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

    // Parse and validate request body
    let requestBody
    try {
      requestBody = await req.json()
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { email, password, fullName, csrfToken } = requestBody
    
    // Enhanced input validation
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      return new Response(
        JSON.stringify({ error: emailValidation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({ error: passwordValidation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const nameValidation = validateFullName(fullName)
    if (!nameValidation.valid) {
      return new Response(
        JSON.stringify({ error: nameValidation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // CSRF protection
    if (!csrfToken || !validateCSRFToken(csrfToken, req)) {
      console.log('CSRF token validation failed')
      return new Response(
        JSON.stringify({ error: 'Invalid or missing security token' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Atomic bootstrap completion check
    const bootstrapCheck = await atomicBootstrapCheck(supabaseAdmin)
    if (!bootstrapCheck.canProceed) {
      return new Response(
        JSON.stringify({ error: bootstrapCheck.error }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log('Attempting to create user:', email)

    // Sanitize inputs
    const sanitizedEmail = email.trim().toLowerCase()
    const sanitizedFullName = fullName.trim()

    // Create the user using the admin client
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: sanitizedEmail,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: sanitizedFullName
      }
    })

    if (userError) {
      console.error('Error creating user:', userError)
      return new Response(
        JSON.stringify({ error: 'Failed to create admin account' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('User created successfully:', user.user?.id)

    // Begin atomic transaction simulation
    let transactionSuccess = false

    try {
      // Insert into admin_users table
      const { error: insertError } = await supabaseAdmin
        .from('admin_users')
        .insert({
          id: user.user!.id,
          email: sanitizedEmail,
          full_name: sanitizedFullName,
          role: 'super_admin',
          is_active: true,
          created_by: user.user!.id // Self-created
        })

      if (insertError) {
        throw new Error(`Admin record creation failed: ${insertError.message}`)
      }

      // Update the admin registration to completed
      const { error: updateRegistrationError } = await supabaseAdmin
        .from('admin_registrations')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('email', sanitizedEmail)
        .eq('registration_type', 'bootstrap')

      if (updateRegistrationError) {
        console.error('Error updating admin registration:', updateRegistrationError)
        // Don't fail the whole process for this
      }

      // Set bootstrap as completed - this MUST succeed
      const { error: bootstrapError } = await supabaseAdmin
        .from('system_config')
        .upsert({
          config_key: 'bootstrap_completed',
          config_value: 'true',
          description: 'Indicates if system bootstrap has been completed'
        })

      if (bootstrapError) {
        throw new Error(`Bootstrap completion failed: ${bootstrapError.message}`)
      }

      transactionSuccess = true
      console.log('Super admin created successfully and bootstrap completed')

    } catch (transactionError) {
      console.error('Transaction failed, rolling back:', transactionError)
      
      // Rollback: Delete the created auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(user.user!.id)
        console.log('Successfully rolled back user creation')
      } catch (rollbackError) {
        console.error('Failed to rollback user creation:', rollbackError)
      }
      
      return new Response(
        JSON.stringify({ error: 'System initialization failed' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!transactionSuccess) {
      return new Response(
        JSON.stringify({ error: 'Transaction failed' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log security event
    await supabaseAdmin.rpc('log_security_event', {
      event_type: 'bootstrap_completed',
      user_id: user.user!.id,
      tenant_id: null,
      metadata: {
        email: sanitizedEmail,
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || 'unknown'
      },
      ip_address: clientIP,
      user_agent: req.headers.get('user-agent') || 'unknown'
    })

    return new Response(
      JSON.stringify({ 
        message: 'Super admin created successfully',
        user_id: user.user!.id,
        email: sanitizedEmail
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