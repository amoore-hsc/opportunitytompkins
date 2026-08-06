import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { notifyGoogleChat } from "../_shared/googleChat.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (s: unknown): string => {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

interface DeactivationEmailRequest {
  to: string[];
  orgName: string;
  opportunityType: string; // "education" | "volunteer"
  positionTitle?: string | null;
  programName?: string | null;
  positionsFilled?: number | null;
  removalReason?: string | null;
  deactivatedAt?: string | null;
  editToken: string;
  siteUrl?: string;
}

export const buildDeactivationEmail = (body: DeactivationEmailRequest) => {
  const siteUrl = body.siteUrl || Deno.env.get("SITE_URL") || "https://tompkins-opportunity.org";
  const reactivateUrl = `${siteUrl}/edit-opportunity/${body.editToken}`;
  const isEducation = body.opportunityType === "education";
  const listingName = (isEducation ? body.programName : body.positionTitle) || "Your listing";

  const removedOn = body.deactivatedAt
    ? new Date(body.deactivatedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "America/New_York",
      })
    : new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "America/New_York",
      });

  const detailsHtml = `<p style="margin:0 0 8px 0;"><strong>Organization:</strong> ${escapeHtml(body.orgName)}</p>
<p style="margin:0 0 8px 0;"><strong>${isEducation ? "Program" : "Position"}:</strong> ${escapeHtml(listingName)}</p>
<p style="margin:0 0 8px 0;"><strong>Removed On:</strong> ${escapeHtml(removedOn)}</p>
<p style="margin:0 0 8px 0;"><strong>Reason:</strong> ${escapeHtml(body.removalReason || "Expired")}</p>
${
    body.positionsFilled !== null && body.positionsFilled !== undefined
      ? `<p style="margin:0 0 0 0;"><strong>Positions Filled:</strong> ${escapeHtml(body.positionsFilled)}</p>`
      : ""
  }`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Listing Deactivated</title>
</head>
<body style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.6; color:#333333; background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">
<tr>
<td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; max-width:600px; border-radius:8px; overflow:hidden;">

<!-- Header -->
<tr>
<td style="background-color:#1e3a5f; padding:30px; text-align:center;">
<h1 style="margin:0; font-size:28px; color:#ffffff;">Listing Deactivated</h1>
</td>
</tr>

<!-- Main Content -->
<tr>
<td style="padding:30px;">

<p style="margin:0 0 25px 0;">This listing has been deactivated and is no longer visible to the public.</p>

<!-- Listing Details Card -->
<div style="background-color:#f0f7ff; border-left:4px solid #1e3a5f; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#1e3a5f;">Deactivated Listing</h2>
${detailsHtml}
</div>

<!-- Reactivate Card (Green) -->
<div style="background-color:#e6f7e6; border-left:4px solid #2e7d32; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#2e7d32;">Reactivate Anytime</h2>
<p style="margin:0 0 15px 0;">Your listing has not been deleted. Click the button below to reactivate if the opportunity becomes available again.</p>
<p style="margin:0 0 15px 0; text-align:center;">
<a href="${reactivateUrl}" style="display:inline-block; padding:14px 28px; background-color:#2e7d32; color:#ffffff; text-decoration:none; font-weight:bold; border-radius:6px;">Reactivate Your Listing</a>
</p>
<p style="margin:0; font-size:13px; color:#666666; text-align:center;">This link is unique to your listing. Please keep it safe and do not share it publicly.</p>
</div>

<!-- Need Help Card (Orange) -->
<div style="background-color:#fff0e6; border-left:4px solid #e67e22; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#e67e22;">Need Help?</h2>
<p style="margin:0;">For additional assistance, please email: <a href="mailto:rhinton@uwtc.org" style="color:#1e3a5f; font-weight:bold;">rhinton@uwtc.org</a></p>
</div>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color:#1e3a5f; padding:25px; text-align:center;">
<p style="margin:0 0 5px 0; color:#ffffff; font-size:16px;">Need Help?</p>
<p style="margin:0; color:#a0c4e8; font-size:14px;">Contact us at <a href="mailto:rhinton@uwtc.org" style="color:#ffffff; font-weight:bold;">rhinton@uwtc.org</a></p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;

  const subject = `${listingName} - Listing Deactivated`;
  return { html, subject, listingName };
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Deactivation email function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: DeactivationEmailRequest = await req.json();

    const recipients = (body.to || [])
      .filter((e) => typeof e === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No valid recipients" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!body.editToken) {
      return new Response(JSON.stringify({ error: "editToken is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { html, subject, listingName } = buildDeactivationEmail(body);

    const emailResponse = await resend.emails.send({
      from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
      to: recipients,
      subject,
      html,
    });

    if ((emailResponse as any)?.error) {
      console.error("Resend rejected deactivation email:", (emailResponse as any).error);
      return new Response(
        JSON.stringify({ error: "Email provider rejected the message", details: (emailResponse as any).error }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    console.log("Deactivation email sent to", recipients.join(", "));

    await notifyGoogleChat({
      icon: "📕",
      title: "Listing Deactivated",
      subtitle: body.orgName || "Unknown organization",
      fields: [
        { label: "Listing", value: listingName },
        { label: "Reason", value: body.removalReason || "Not specified" },
        {
          label: "Positions Filled",
          value:
            body.positionsFilled === null || body.positionsFilled === undefined
              ? "Not specified"
              : String(body.positionsFilled),
        },
      ],
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-deactivation-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
