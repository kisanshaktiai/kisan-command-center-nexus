import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validation functions (will be replaced with @kisanshakti/whitelabel-types when available)
function validateWhiteLabelConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate required fields
  if (!config.tenant_id) {
    errors.push('tenant_id is required');
  }

  // Validate CSS injection for dangerous patterns
  if (config.css_injection) {
    const dangerousPatterns = [
      /@import/i,
      /javascript:/i,
      /<script/i,
      /expression\(/i,
      /behavior:/i,
      /-moz-binding/i,
      /data:text\/html/i,
    ];

    for (const [key, value] of Object.entries(config.css_injection)) {
      if (typeof value === 'string') {
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            errors.push(`Dangerous pattern detected in css_injection.${key}`);
          }
        }
      }
    }
  }

  // Validate color formats
  if (config.brand_identity) {
    const colorFields = ['primary_color', 'secondary_color', 'accent_color'];
    for (const field of colorFields) {
      if (config.brand_identity[field]) {
        const color = config.brand_identity[field];
        if (!/^#[0-9A-Fa-f]{6}$/.test(color) && !/^rgb/.test(color) && !/^hsl/.test(color)) {
          errors.push(`Invalid color format in brand_identity.${field}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function sanitizeWhiteLabelConfig(config: any): any {
  const sanitized = { ...config };

  // Sanitize CSS injection
  if (sanitized.css_injection) {
    const dangerousPatterns = [
      { pattern: /@import/gi, replacement: '/* @import blocked */' },
      { pattern: /javascript:/gi, replacement: '/* javascript: blocked */' },
      { pattern: /<script/gi, replacement: '/* script blocked */' },
      { pattern: /expression\(/gi, replacement: '/* expression blocked */' },
      { pattern: /behavior:/gi, replacement: '/* behavior blocked */' },
      { pattern: /-moz-binding/gi, replacement: '/* moz-binding blocked */' },
      { pattern: /data:text\/html/gi, replacement: '/* data uri blocked */' },
    ];

    for (const [key, value] of Object.entries(sanitized.css_injection)) {
      if (typeof value === 'string') {
        let sanitizedValue = value;
        for (const { pattern, replacement } of dangerousPatterns) {
          sanitizedValue = sanitizedValue.replace(pattern, replacement);
        }
        sanitized.css_injection[key] = sanitizedValue;
      }
    }
  }

  // Sanitize HTML content
  if (sanitized.email_templates) {
    for (const [key, value] of Object.entries(sanitized.email_templates)) {
      if (typeof value === 'string') {
        // Remove script tags and event handlers
        sanitized.email_templates[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
          .replace(/on\w+\s*=\s*'[^']*'/gi, '');
      }
    }
  }

  return sanitized;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ message: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload = await req.json();

    // Validate configuration
    const { valid, errors } = validateWhiteLabelConfig(payload);
    if (!valid) {
      return new Response(
        JSON.stringify({ message: 'Invalid configuration', errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize configuration
    const sanitized = sanitizeWhiteLabelConfig(payload);

    // Add metadata
    sanitized.updated_at = new Date().toISOString();
    sanitized.is_validated = true;
    sanitized.validation_errors = [];

    // Check if config exists
    const { data: existingConfig } = await supabaseAdmin
      .from('white_label_configs')
      .select('id')
      .eq('tenant_id', sanitized.tenant_id)
      .single();

    let result;
    if (existingConfig) {
      // Update existing config
      const { data, error } = await supabaseAdmin
        .from('white_label_configs')
        .update(sanitized)
        .eq('tenant_id', sanitized.tenant_id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new config
      sanitized.created_at = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from('white_label_configs')
        .insert([sanitized])
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Log the operation (audit trail)
    console.log('White label config saved:', {
      tenant_id: sanitized.tenant_id,
      config_id: result.id,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error saving white label config:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error', error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});