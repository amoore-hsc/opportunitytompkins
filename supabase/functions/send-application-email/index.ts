import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { notifyGoogleChat } from "../_shared/googleChat.ts";
import { getFromEmail, getSupportEmail, getAlertRecipients, getSiteName } from "../_shared/emailConfig.ts";
import { getErrorMessage } from "../_shared/errors.ts";

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

// Caps how many applications one listing can receive per day. Protects
// organizations' inboxes from automated flooding; real traffic is far lower.
const MAX_APPLICATIONS_PER_LISTING_PER_DAY = 25;

const BodySchema = z.object({
  clientName: z.string().trim().min(1).max(200),
  clientEmail: z.string().trim().email().max(320),
  clientPhone: z.string().trim().min(1).max(50),
  hoursRequested: z.string().trim().min(1).max(200),
  opportunityId: z.string().uuid(),
  // Honeypot: hidden from real users, so it must be empty. Bots fill every field.
  website: z.string().optional().nullable(),
});

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const handler = async (req: Request): Promise<Response> => {
  console.log("Application email function invoked");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return jsonResponse({ error: "Please fill out every field with valid information." }, 400);
    }

    // Honeypot triggered: pretend it worked so bots don't retry.
    if (parsed.data.website && parsed.data.website.trim() !== "") {
      console.log("Honeypot triggered — silently dropping application");
      return jsonResponse({ ok: true }, 200);
    }

    const { clientName, clientEmail, clientPhone, hoursRequested, opportunityId } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch listing details server-side (never trust client input for what goes in the emails)
    const { data: opp, error: oppError } = await supabaseClient
      .from("opportunities")
      .select("org_email, org_phone, contact_name, admin_email, org_name, position_title, type, active")
      .eq("id", opportunityId)
      .maybeSingle();

    if (oppError || !opp || !opp.active) {
      console.error("Opportunity lookup failed or listing inactive:", oppError);
      return jsonResponse({ error: "This listing is no longer available." }, 404);
    }

    const orgEmail = opp.org_email;
    const orgPhone = opp.org_phone;
    const orgName = opp.org_name;
    const positionTitle = opp.position_title || "";
    const opportunityType = opp.type === "volunteer" ? "Volunteer" : "Education & Training";
    const contactName = opp.contact_name || opp.org_name;
    const adminEmail = opp.admin_email || undefined;

    // Send the application notification to the admin email if available, otherwise to the public org email
    const notificationEmail = adminEmail || orgEmail;

    // Track application count (aggregated, no personal data stored) and enforce the daily cap
    const today = new Date().toISOString().split('T')[0];
    const { data: existing, error: countLookupError } = await supabaseClient
      .from('application_counts')
      .select('id, count')
      .eq('opportunity_id', opportunityId)
      .eq('application_date', today)
      .maybeSingle();

    if (countLookupError) {
      console.error("Error reading application count:", countLookupError);
    } else if (existing && existing.count >= MAX_APPLICATIONS_PER_LISTING_PER_DAY) {
      console.warn(`Daily application cap reached for opportunity ${opportunityId}`);
      return jsonResponse(
        { error: "This listing has received the maximum number of applications for today. Please try again tomorrow." },
        429,
      );
    }

    console.log(`Sending application email to ${notificationEmail} from ${clientName}`);

    try {
      if (existing) {
        await supabaseClient
          .from('application_counts')
          .update({ count: existing.count + 1 })
          .eq('id', existing.id);
        console.log(`Incremented application count for opportunity ${opportunityId}`);
      } else if (!countLookupError) {
        await supabaseClient
          .from('application_counts')
          .insert({ opportunity_id: opportunityId, application_date: today, count: 1 });
        console.log(`Created new application count for opportunity ${opportunityId}`);
      }
    } catch (countError) {
      console.error("Error tracking application count:", countError);
      // Don't fail the email send if count tracking fails
    }

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Application</title>
</head>
<body style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.6; color:#333333; background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">
<tr>
<td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; max-width:600px; border-radius:8px; overflow:hidden;">

<!-- Header -->
<tr>
<td style="background-color:#1e3a5f; padding:30px; text-align:center;">
<h1 style="margin:0; font-size:28px; color:#ffffff;">New Client Application</h1>
</td>
</tr>

<!-- Main Content -->
<tr>
<td style="padding:30px;">

<p style="margin:0 0 25px 0;">You have received a new application through ${getSiteName()}.</p>

<!-- Opportunity Details Card -->
<div style="background-color:#f0f7ff; border-left:4px solid #1e3a5f; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#1e3a5f;">Opportunity Details</h2>
<p style="margin:0 0 0 0;"><strong>Position Title:</strong> ${escapeHtml(positionTitle || 'Not specified')}</p>
</div>

<!-- Client Information Card -->
<div style="background-color:#e6f7e6; border-left:4px solid #2e7d32; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#2e7d32;">Client Information</h2>
<p style="margin:0 0 8px 0;"><strong>Name:</strong> ${escapeHtml(clientName)}</p>
<p style="margin:0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(clientEmail)}</p>
<p style="margin:0 0 8px 0;"><strong>Phone:</strong> ${escapeHtml(clientPhone)}</p>
<p style="margin:0 0 0 0;"><strong>Hours Requested:</strong> ${escapeHtml(hoursRequested)}</p>
</div>

<!-- Next Steps Card -->
<div style="background-color:#fff0e6; border-left:4px solid #e67e22; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#e67e22;">Next Steps</h2>
<p style="margin:0 0 8px 0;">1. Contact the applicant to confirm their availability and interest</p>
<p style="margin:0 0 8px 0;">2. Complete monthly documentation on behalf of the volunteer</p>
<p style="margin:0 0 0 0;">3. Remove your posting when the position has been filled using the edit link from your confirmation email</p>
</div>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color:#1e3a5f; padding:25px; text-align:center;">
<p style="margin:0 0 5px 0; color:#ffffff; font-size:16px;">Need Help?</p>
<p style="margin:0; color:#a0c4e8; font-size:14px;"><a href="mailto:${getSupportEmail()}" style="color:#ffffff; font-weight:bold;">Contact Us</a></p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;

    // Email to organization
    const orgEmailResponse = await resend.emails.send({
      from: getFromEmail(),
      to: [notificationEmail],
      subject: `New Application - ${positionTitle || 'Position'}`,
      html: emailHtml,
    });

    console.log("Organization email sent successfully:", orgEmailResponse);

    await notifyGoogleChat({
      icon: "🙋",
      title: "New application submitted",
      fields: [
        { label: "Position", value: positionTitle || "Not specified" },
        { label: "Organization", value: orgName || "Unknown" },
      ],
    });

    // Applicant confirmation email
    const applicantEmailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Application Submitted</title>
</head>
<body style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.6; color:#333333; background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">
<tr>
<td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; max-width:600px; border-radius:8px; overflow:hidden;">

<!-- Header -->
<tr>
<td style="background-color:#1e3a5f; padding:30px; text-align:center;">
<h1 style="margin:0; font-size:28px; color:#ffffff;">Application Submitted!</h1>
</td>
</tr>

<!-- Main Content -->
<tr>
<td style="padding:30px;">

<p style="margin:0 0 25px 0;">Hi ${escapeHtml(clientName)},</p>

<p style="margin:0 0 25px 0;">Thank you for submitting your application through ${getSiteName()}. Here's a summary of your application:</p>

<!-- Application Details Card -->
<div style="background-color:#f0f7ff; border-left:4px solid #1e3a5f; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#1e3a5f;">Application Details</h2>
<p style="margin:0 0 8px 0;"><strong>Position:</strong> ${escapeHtml(positionTitle || 'Not specified')}</p>
<p style="margin:0 0 8px 0;"><strong>Organization:</strong> ${escapeHtml(orgName)}</p>
<p style="margin:0 0 8px 0;"><strong>Type:</strong> ${escapeHtml(opportunityType)}</p>
<p style="margin:0 0 0 0;"><strong>Hours Requested:</strong> ${escapeHtml(hoursRequested)}</p>
</div>

<!-- Your Information Card -->
<div style="background-color:#e6f7e6; border-left:4px solid #2e7d32; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#2e7d32;">Your Contact Information</h2>
<p style="margin:0 0 8px 0;"><strong>Name:</strong> ${escapeHtml(clientName)}</p>
<p style="margin:0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(clientEmail)}</p>
<p style="margin:0 0 0 0;"><strong>Phone:</strong> ${escapeHtml(clientPhone)}</p>
</div>

<!-- Next Steps Card -->
<div style="background-color:#fff0e6; border-left:4px solid #e67e22; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#e67e22;">What Happens Next?</h2>
<p style="margin:0 0 8px 0;"><strong>${escapeHtml(orgName)}</strong> will review your application. A member of the organization may reach out to you to get more information or discuss next steps.</p>
<p style="margin:0 0 0 0;">If you don't hear from the organization within 2 weeks, please reach out directly.</p>
</div>

<!-- Organization Contact Card -->
<div style="background-color:#f5f0ff; border-left:4px solid #6b46c1; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#6b46c1;">Organization Contact Information</h2>
<p style="margin:0 0 8px 0;"><strong>Name:</strong> ${escapeHtml(contactName)}</p>
<p style="margin:0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(orgEmail)}</p>
<p style="margin:0 0 0 0;"><strong>Phone:</strong> ${escapeHtml(orgPhone)}</p>
</div>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color:#1e3a5f; padding:25px; text-align:center;">
<p style="margin:0 0 5px 0; color:#ffffff; font-size:16px;">Need Help?</p>
<p style="margin:0; color:#a0c4e8; font-size:14px;"><a href="mailto:${getSupportEmail()}" style="color:#ffffff; font-weight:bold;">Contact Us</a></p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;

    const applicantEmailResponse = await resend.emails.send({
      from: getFromEmail(),
      to: [clientEmail],
      subject: `Application Submitted - ${positionTitle || 'Position'} at ${orgName}`,
      html: applicantEmailHtml,
    });

    console.log("Applicant confirmation email sent successfully:", applicantEmailResponse);

    return new Response(JSON.stringify({ orgEmail: orgEmailResponse, applicantEmail: applicantEmailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error in send-application-email function:", error);
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);