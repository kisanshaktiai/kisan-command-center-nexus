// Cloudflare DNS Manager Edge Function
// Manages DNS records and SSL for triple domain architecture

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CloudflareConfig {
  zone_id: string;
  api_token: string;
  proxied: boolean;
}

interface DomainRecord {
  type: 'A' | 'CNAME';
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, tenant_id, portal_type, domain, cloudflare_config } = await req.json();

    // Validate required fields
    if (!tenant_id || !cloudflare_config) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: tenant_id, cloudflare_config' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { zone_id, api_token, proxied } = cloudflare_config as CloudflareConfig;

    if (!zone_id || !api_token) {
      return new Response(
        JSON.stringify({ error: 'Missing Cloudflare credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cloudflareHeaders = {
      'Authorization': `Bearer ${api_token}`,
      'Content-Type': 'application/json',
    };

    let result;

    switch (action) {
      case 'create_record': {
        // Create DNS record in Cloudflare
        const record: DomainRecord = {
          type: domain.includes('.') ? 'CNAME' : 'A',
          name: domain,
          content: domain.includes('.') ? 'your-app.lovable.app' : '185.158.133.1',
          proxied: proxied ?? true,
          ttl: proxied ? 1 : 3600, // Auto if proxied, 1 hour otherwise
        };

        const createResponse = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records`,
          {
            method: 'POST',
            headers: cloudflareHeaders,
            body: JSON.stringify(record),
          }
        );

        const createData = await createResponse.json();

        if (!createResponse.ok) {
          throw new Error(`Cloudflare API error: ${JSON.stringify(createData)}`);
        }

        // Update white_label_configs with Cloudflare record ID
        const { error: updateError } = await supabaseClient
          .from('white_label_configs')
          .update({
            domain_config: supabaseClient.rpc('jsonb_set', {
              target: 'domain_config',
              path: `{${portal_type},cloudflare_record_id}`,
              new_value: JSON.stringify(createData.result.id),
            }),
          })
          .eq('tenant_id', tenant_id);

        if (updateError) {
          console.error('Error updating config:', updateError);
        }

        result = { success: true, record: createData.result };
        break;
      }

      case 'update_record': {
        const { record_id } = await req.json();
        
        if (!record_id) {
          return new Response(
            JSON.stringify({ error: 'Missing record_id for update' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updateRecord: Partial<DomainRecord> = {
          content: domain.includes('.') ? 'your-app.lovable.app' : '185.158.133.1',
          proxied: proxied ?? true,
        };

        const updateResponse = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${record_id}`,
          {
            method: 'PATCH',
            headers: cloudflareHeaders,
            body: JSON.stringify(updateRecord),
          }
        );

        const updateData = await updateResponse.json();

        if (!updateResponse.ok) {
          throw new Error(`Cloudflare API error: ${JSON.stringify(updateData)}`);
        }

        result = { success: true, record: updateData.result };
        break;
      }

      case 'delete_record': {
        const { record_id } = await req.json();
        
        if (!record_id) {
          return new Response(
            JSON.stringify({ error: 'Missing record_id for deletion' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const deleteResponse = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${record_id}`,
          {
            method: 'DELETE',
            headers: cloudflareHeaders,
          }
        );

        const deleteData = await deleteResponse.json();

        if (!deleteResponse.ok) {
          throw new Error(`Cloudflare API error: ${JSON.stringify(deleteData)}`);
        }

        result = { success: true };
        break;
      }

      case 'verify_ssl': {
        // Check SSL certificate status
        const sslResponse = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zone_id}/ssl/verification`,
          {
            headers: cloudflareHeaders,
          }
        );

        const sslData = await sslResponse.json();

        if (!sslResponse.ok) {
          throw new Error(`Cloudflare API error: ${JSON.stringify(sslData)}`);
        }

        result = { success: true, ssl_status: sslData.result };
        break;
      }

      case 'list_records': {
        // List all DNS records for the zone
        const listResponse = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records`,
          {
            headers: cloudflareHeaders,
          }
        );

        const listData = await listResponse.json();

        if (!listResponse.ok) {
          throw new Error(`Cloudflare API error: ${JSON.stringify(listData)}`);
        }

        result = { success: true, records: listData.result };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
