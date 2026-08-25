import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { notifyGoogleChat } from "../_shared/googleChat.ts";
import { getFromEmail, getSupportEmail, getAlertRecipients, getSiteName } from "../_shared/emailConfig.ts";

const escapeHtml = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const rawSiteUrl = (Deno.env.get("SITE_URL") ?? "https://example.com").trim();
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

    const chatDelivered = await notifyGoogleChat({
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

    // Backup email: only sent when the Google Chat post did not go through.
    if (!chatDelivered) {
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: getFromEmail(),
            to: getAlertRecipients(),
            subject: `[Backup] ${label} submitted`,
            html: `<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;max-width:600px;border-radius:8px;overflow:hidden;">
<tr><td style="background-color:#1e3a5f;padding:30px;text-align:center;">
<h1 style="margin:0;font-size:24px;color:#ffffff;">${escapeHtml(label)} submitted</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="margin:0 0 20px 0;">The Google Chat notification could not be delivered, so this backup email was sent instead.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f7ff;border-radius:8px;">
<tr><td style="padding:20px;">
<p style="margin:0 0 8px 0;"><strong>Type:</strong> ${escapeHtml(label)}</p>
<p style="margin:0 0 8px 0;"><strong>Page:</strong> ${escapeHtml(page_path || "Not provided")}</p>
<p style="margin:0 0 8px 0;"><strong>From:</strong> ${escapeHtml(submitter_email || submitter_name || "Anonymous")}</p>
<p style="margin:0;"><strong>Message:</strong> ${escapeHtml(message)}</p>
</td></tr></table>
<p style="margin:25px 0 0 0;"><a href="${SITE_URL}/admin" style="background-color:#7cb342;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;font-weight:bold;">Open admin dashboard</a></p>
</td></tr>
</table></td></tr></table></body></html>`,
          });
          console.log("Backup feedback email sent (Chat post failed).");
        } else {
          console.error("Chat post failed and RESEND_API_KEY is not configured.");
        }
      } catch (mailErr) {
        console.error("Backup feedback email failed:", mailErr);
      }
    }

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
