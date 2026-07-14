import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface ApplicationEmailRequest {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  hoursRequested: string;
  orgName: string;
  opportunityDescription: string;
  opportunityType: string;
  positionTitle: string;
  opportunityId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Application email function invoked");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      clientName,
      clientEmail,
      clientPhone,
      hoursRequested,
      orgName,
      opportunityDescription,
      opportunityType,
      positionTitle,
      opportunityId,
    }: ApplicationEmailRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch contact info server-side (never trust client input for org contact details)
    const { data: opp, error: oppError } = await supabaseClient
      .from("opportunities")
      .select("org_email, org_phone, contact_name, admin_email, org_name")
      .eq("id", opportunityId)
      .maybeSingle();

    if (oppError || !opp) {
      console.error("Opportunity lookup failed:", oppError);
      return new Response(
        JSON.stringify({ error: "Opportunity not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const orgEmail = opp.org_email;
    const orgPhone = opp.org_phone;
    const contactName = opp.contact_name || opp.org_name;
    const adminEmail = opp.admin_email || undefined;

    // Send the application notification to the admin email if available, otherwise to the public org email
    const notificationEmail = adminEmail || orgEmail;

    console.log(`Sending application email to ${notificationEmail} from ${clientName}`);

    // Track application count (aggregated, no personal data stored)
    if (opportunityId) {
      try {
        const today = new Date().toISOString().split('T')[0];

        
        // Try to increment existing count, or insert new row
        const { data: existing } = await supabaseClient
          .from('application_counts')
          .select('id, count')
          .eq('opportunity_id', opportunityId)
          .eq('application_date', today)
          .maybeSingle();
        
        if (existing) {
          await supabaseClient
            .from('application_counts')
            .update({ count: existing.count + 1 })
            .eq('id', existing.id);
          console.log(`Incremented application count for opportunity ${opportunityId}`);
        } else {
          await supabaseClient
            .from('application_counts')
            .insert({ opportunity_id: opportunityId, application_date: today, count: 1 });
          console.log(`Created new application count for opportunity ${opportunityId}`);
        }
      } catch (countError) {
        console.error("Error tracking application count:", countError);
        // Don't fail the email send if count tracking fails
      }
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

<p style="margin:0 0 25px 0;">You have received a new application through Tompkins Opportunity.</p>

<!-- Opportunity Details Card -->
<div style="background-color:#f0f7ff; border-left:4px solid #1e3a5f; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#1e3a5f;">Opportunity Details</h2>
<p style="margin:0 0 0 0;"><strong>Position Title:</strong> ${positionTitle || 'Not specified'}</p>
</div>

<!-- Client Information Card -->
<div style="background-color:#e6f7e6; border-left:4px solid #2e7d32; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#2e7d32;">Client Information</h2>
<p style="margin:0 0 8px 0;"><strong>Name:</strong> ${clientName}</p>
<p style="margin:0 0 8px 0;"><strong>Email:</strong> ${clientEmail}</p>
<p style="margin:0 0 8px 0;"><strong>Phone:</strong> ${clientPhone}</p>
<p style="margin:0 0 0 0;"><strong>Hours Requested:</strong> ${hoursRequested}</p>
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
<p style="margin:0; color:#a0c4e8; font-size:14px;"><a href="mailto:rhinton@uwtc.org" style="color:#ffffff; font-weight:bold;">Contact Us</a></p>
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
      from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
      to: [notificationEmail],
      subject: `New Application - ${positionTitle || 'Position'}`,
      html: emailHtml,
    });

    console.log("Organization email sent successfully:", orgEmailResponse);

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

<p style="margin:0 0 25px 0;">Hi ${clientName},</p>

<p style="margin:0 0 25px 0;">Thank you for submitting your application through Tompkins Opportunity. Here's a summary of your application:</p>

<!-- Application Details Card -->
<div style="background-color:#f0f7ff; border-left:4px solid #1e3a5f; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#1e3a5f;">Application Details</h2>
<p style="margin:0 0 8px 0;"><strong>Position:</strong> ${positionTitle || 'Not specified'}</p>
<p style="margin:0 0 8px 0;"><strong>Organization:</strong> ${orgName}</p>
<p style="margin:0 0 8px 0;"><strong>Type:</strong> ${opportunityType}</p>
<p style="margin:0 0 0 0;"><strong>Hours Requested:</strong> ${hoursRequested}</p>
</div>

<!-- Your Information Card -->
<div style="background-color:#e6f7e6; border-left:4px solid #2e7d32; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#2e7d32;">Your Contact Information</h2>
<p style="margin:0 0 8px 0;"><strong>Name:</strong> ${clientName}</p>
<p style="margin:0 0 8px 0;"><strong>Email:</strong> ${clientEmail}</p>
<p style="margin:0 0 0 0;"><strong>Phone:</strong> ${clientPhone}</p>
</div>

<!-- Next Steps Card -->
<div style="background-color:#fff0e6; border-left:4px solid #e67e22; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#e67e22;">What Happens Next?</h2>
<p style="margin:0 0 8px 0;"><strong>${orgName}</strong> will review your application. A member of the organization may reach out to you to get more information or discuss next steps.</p>
<p style="margin:0 0 0 0;">If you don't hear from the organization within 2 weeks, please reach out directly.</p>
</div>

<!-- Organization Contact Card -->
<div style="background-color:#f5f0ff; border-left:4px solid #6b46c1; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#6b46c1;">Organization Contact Information</h2>
<p style="margin:0 0 8px 0;"><strong>Name:</strong> ${contactName}</p>
<p style="margin:0 0 8px 0;"><strong>Email:</strong> ${orgEmail}</p>
<p style="margin:0 0 0 0;"><strong>Phone:</strong> ${orgPhone}</p>
</div>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color:#1e3a5f; padding:25px; text-align:center;">
<p style="margin:0 0 5px 0; color:#ffffff; font-size:16px;">Need Help?</p>
<p style="margin:0; color:#a0c4e8; font-size:14px;"><a href="mailto:rhinton@uwtc.org" style="color:#ffffff; font-weight:bold;">Contact Us</a></p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;

    const applicantEmailResponse = await resend.emails.send({
      from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
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
  } catch (error: any) {
    console.error("Error in send-application-email function:", error);
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