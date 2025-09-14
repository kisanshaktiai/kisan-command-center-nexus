
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentProcessRequest {
  documentId: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;
  verifiedBy: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { documentId, action, rejectionReason, verifiedBy }: DocumentProcessRequest = await req.json();

    if (!documentId || !action || !verifiedBy) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify the admin user exists
    const { data: adminUser, error: adminError } = await supabaseClient
      .from('admin_users')
      .select('id, role')
      .eq('id', verifiedBy)
      .eq('is_active', true)
      .single();

    if (adminError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid admin user' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the document
    const { data: document, error: docError } = await supabaseClient
      .from('tenant_legal_documents')
      .select('*, tenants(name, owner_email)')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update document status
    const updateData: any = {
      verification_status: action === 'approve' ? 'approved' : 'rejected',
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (action === 'reject' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    const { data: updatedDocument, error: updateError } = await supabaseClient
      .from('tenant_legal_documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating document:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update document' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log the action
    await supabaseClient
      .from('admin_audit_logs')
      .insert({
        admin_id: verifiedBy,
        action: `document_${action}`,
        details: {
          document_id: documentId,
          document_type: document.document_type,
          tenant_id: document.tenant_id,
          rejection_reason: rejectionReason
        }
      });

    // Send notification email to tenant (you can implement this)
    console.log(`Document ${action} for tenant:`, document.tenants?.owner_email);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Document ${action}d successfully`,
        document: updatedDocument
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
