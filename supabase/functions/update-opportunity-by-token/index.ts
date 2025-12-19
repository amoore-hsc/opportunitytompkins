import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateOpportunityRequest {
  token: string;
  action?: "update" | "deactivate";
  updates?: {
    type?: string;
    role_classification?: string;
    position_title?: string | null;
    description?: string;
    location?: string;
    on_bus_route?: boolean;
    hours_available?: string;
    days_times_available?: string;
    additional_requirements?: string | null;
    org_name?: string;
    org_email?: string;
    org_phone?: string;
  };
  deactivation?: {
    positions_filled: number;
    removal_reason: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Update opportunity by token function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, action = "update", updates, deactivation }: UpdateOpportunityRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return new Response(
        JSON.stringify({ error: "Invalid token format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First verify the token exists
    const { data: existingOpportunity, error: fetchError } = await supabase
      .from("opportunities")
      .select("id, active")
      .eq("edit_token", token)
      .maybeSingle();

    if (fetchError) {
      console.error("Database error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!existingOpportunity) {
      return new Response(
        JSON.stringify({ error: "Opportunity not found or invalid token" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Handle deactivation action
    if (action === "deactivate") {
      if (!deactivation) {
        return new Response(
          JSON.stringify({ error: "Deactivation data is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Deactivating opportunity:", existingOpportunity.id, "Positions filled:", deactivation.positions_filled);

      const { data: deactivatedOpportunity, error: deactivateError } = await supabase
        .from("opportunities")
        .update({
          active: false,
          positions_filled: deactivation.positions_filled,
          removal_reason: deactivation.removal_reason,
          deactivated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("edit_token", token)
        .select()
        .single();

      if (deactivateError) {
        console.error("Deactivation error:", deactivateError);
        return new Response(
          JSON.stringify({ error: "Failed to deactivate opportunity" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Opportunity deactivated:", deactivatedOpportunity.id);

      return new Response(
        JSON.stringify({ success: true, opportunity: { id: deactivatedOpportunity.id }, action: "deactivated" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Handle regular update action
    if (!updates) {
      return new Response(
        JSON.stringify({ error: "Updates data is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: updatedOpportunity, error: updateError } = await supabase
      .from("opportunities")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("edit_token", token)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update opportunity" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Opportunity updated:", updatedOpportunity.id);

    return new Response(
      JSON.stringify({ success: true, opportunity: { id: updatedOpportunity.id } }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in update-opportunity-by-token function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
