
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckUserRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { email }: CheckUserRequest = await req.json();
    console.log('Checking user existence for:', email);

    if (!email?.trim()) {
      return new Response(JSON.stringify({ 
        error: "Email is required",
        exists: false 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Initialize Supabase client with service role key for auth.users access
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user exists in auth.users table
    const { data: authUsers, error: authError } = await supabaseServiceRole.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error checking auth users:", authError);
      return new Response(JSON.stringify({ 
        error: "Failed to check user existence",
        exists: false 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Find user by email
    const existingUser = authUsers.users.find(user => 
      user.email?.toLowerCase() === email.toLowerCase()
    );

    const result = {
      exists: !!existingUser,
      userId: existingUser?.id,
      emailConfirmed: existingUser?.email_confirmed_at ? true : false,
      createdAt: existingUser?.created_at
    };

    console.log('User existence check result:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in check-user-exists function:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Internal server error",
      exists: false 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
