
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DefaultBrandingResponse {
  branding: {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    text_color: string;
    app_name: string;
    app_tagline: string;
    font_family: string;
    logo_url?: string;
  };
  features: {
    ai_chat: boolean;
    weather_forecast: boolean;
    marketplace: boolean;
    community_forum: boolean;
    satellite_imagery: boolean;
    soil_testing: boolean;
    drone_monitoring: boolean;
    iot_integration: boolean;
    ecommerce: boolean;
    payment_gateway: boolean;
    inventory_management: boolean;
    logistics_tracking: boolean;
    basic_analytics: boolean;
    advanced_analytics: boolean;
    predictive_analytics: boolean;
    custom_reports: boolean;
    api_access: boolean;
    webhook_support: boolean;
    third_party_integrations: boolean;
    white_label_mobile_app: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Return default branding and features configuration
    const defaultResponse: DefaultBrandingResponse = {
      branding: {
        primary_color: '#10B981',
        secondary_color: '#065F46',
        accent_color: '#F59E0B',
        background_color: '#FFFFFF',
        text_color: '#111827',
        app_name: 'KisanShakti AI',
        app_tagline: 'Empowering Farmers with AI Technology',
        font_family: 'Inter',
        logo_url: null
      },
      features: {
        ai_chat: true,
        weather_forecast: true,
        marketplace: true,
        community_forum: true,
        satellite_imagery: true,
        soil_testing: true,
        drone_monitoring: false,
        iot_integration: false,
        ecommerce: true,
        payment_gateway: false,
        inventory_management: true,
        logistics_tracking: false,
        basic_analytics: true,
        advanced_analytics: false,
        predictive_analytics: false,
        custom_reports: false,
        api_access: false,
        webhook_support: false,
        third_party_integrations: false,
        white_label_mobile_app: false
      }
    };

    return new Response(JSON.stringify(defaultResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in tenant-default-branding:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
