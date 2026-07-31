import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { notifyGoogleChat } from "../_shared/googleChat.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALERT_RECIPIENTS = ["amoore@hsctc.org"];
const rawSiteUrl = (Deno.env.get("SITE_URL") ?? "https://tompkins-opportunity.org").trim();
const SITE_URL = (/^https?:\/\//i.test(rawSiteUrl) ? rawSiteUrl : `https://${rawSiteUrl}`)
  .replace(/\/+$/, "");

const BodySchema = z.object({
  feedback_type: z.enum(["bug", "feature"]),
  message: z.string().trim().min(5).max(4000),
  submitter_name: z.string().trim().max(200).optional().nullable(),
  submitter_email: z.string().trim().email().max(320).optional().nullable().or(z.literal("")),
  page_path: z.string().trim().max(500).optional().nullable(),
  user_agent: z.string().trim().max(500).optional().nullable(),
  // Honeypot: bots fill every field.
  website: z.string().max(0).optional().nullable(),
});

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Please provide a short description of the issue or idea." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const {
      feedback_type,
      message,
      submitter_name,
      submitter_email,
      page_path,
      user_agent,
    } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: inserted, error: insertErr } = await supabase
      .from("feedback_submissions")
      .insert({
        feedback_type,
        message,
        submitter_name: submitter_name || null,
        submitter_email: submitter_email || null,
        page_path: page_path || null,
        user_agent: user_agent || null,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Feedback insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Could not save your feedback. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const label = feedback_type === "bug" ? "Bug report" : "Feature request";

    try {
      await resend.emails.send({
        from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
        to: ALERT_RECIPIENTS,
        subject: `${feedback_type === "bug" ? "🐞" : "💡"} ${label} submitted`,
        html: `
          <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;max-width:640px;">
            <tr>
              <td style="background:#1e3a5f;padding:20px 24px;">
                <span style="color:#ffffff;font-size:20px;font-weight:bold;">${label}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;color:#111827;">
                <p style="margin:0 0 16px;white-space:pre-wrap;">${escapeHtml(message)}</p>
                <p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong>Page:</strong> ${escapeHtml(page_path || "Not provided")}</p>
                <p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong>Name:</strong> ${escapeHtml(submitter_name || "Not provided")}</p>
                <p style="margin:0 0 6px;font-size:14px;color:#4b5563;"><strong>Email:</strong> ${escapeHtml(submitter_email || "Not provided")}</p>
                <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">View all feedback in the Admin dashboard: <a href="${SITE_URL}/admin">${escapeHtml(SITE_URL)}/admin</a></p>
              </td>
            </tr>
          </table>
        `,
      });
    } catch (e) {
      console.error("Failed to send feedback email:", e);
    }

    await notifyGoogleChat({
      icon: feedback_type === "bug" ? "🐞" : "💡",
      title: `${label} submitted`,
      body: message.slice(0, 1000),
      fields: [
        { label: "Page", value: page_path || "Not provided" },
        { label: "From", value: submitter_email || submitter_name || "Anonymous" },
      ],
      linkText: "Open admin dashboard",
      linkUrl: `${SITE_URL}/admin`,
    });

    return new Response(JSON.stringify({ success: true, id: inserted.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("submit-feedback error:", msg);
    return new Response(JSON.stringify({ error: "Unexpected error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
