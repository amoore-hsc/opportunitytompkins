import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { notifyGoogleChat } from "../_shared/googleChat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const internalSecret = Deno.env.get("INTERNAL_TASK_SECRET");
  const providedSecret = req.headers.get("x-internal-task-secret");
  if (!internalSecret || providedSecret !== internalSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const chatUrl = Deno.env.get("GOOGLE_CHAT_WEBHOOK_URL");
    if (!chatUrl) {
      console.error("GOOGLE_CHAT_WEBHOOK_URL is not configured");
      return new Response(
        JSON.stringify({ ok: false, error: "GOOGLE_CHAT_WEBHOOK_URL is not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const ok = await notifyGoogleChat({
      icon: "💓",
      title: "Weekly webhook heartbeat",
      subtitle: "Feedback notifications are flowing",
      body: "This is an automated weekly test. If you can see this message in Google Chat, the feedback webhook is working correctly.",
      fields: [
        { label: "Checked at", value: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }) },
      ],
    });

    if (!ok) {
      console.error("Weekly webhook heartbeat failed to post to Google Chat");
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to post to Google Chat" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, message: "Heartbeat posted to Google Chat" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("weekly-webhook-test error:", msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
