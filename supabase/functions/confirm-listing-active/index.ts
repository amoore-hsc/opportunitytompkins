import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("confirm-listing-active function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      console.log("No token provided");
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Confirming listing with token: ${token}`);

    // Initialize Supabase client with service role for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, verify the token exists and get the opportunity
    const { data: opportunity, error: fetchError } = await supabase
      .from("opportunities")
      .select("id, org_name, position_title, type, active")
      .eq("edit_token", token)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching opportunity:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch opportunity" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!opportunity) {
      console.log("No opportunity found with this token");
      return new Response(
        JSON.stringify({ error: "Invalid token - listing not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!opportunity.active) {
      console.log("Opportunity is not active");
      return new Response(
        JSON.stringify({ error: "This listing is no longer active" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Update the listing: set updated_at to now and reset reminder_sent_at
    const { error: updateError } = await supabase
      .from("opportunities")
      .update({
        updated_at: new Date().toISOString(),
        reminder_sent_at: null,
      })
      .eq("id", opportunity.id);

    if (updateError) {
      console.error("Error updating opportunity:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to confirm listing" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Successfully confirmed listing: ${opportunity.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Listing confirmed as still active",
        opportunity: {
          id: opportunity.id,
          org_name: opportunity.org_name,
          position_title: opportunity.position_title,
          type: opportunity.type,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in confirm-listing-active function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
