import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { notifyGoogleChat } from "../_shared/googleChat.ts";
import { getFromEmail, getSupportEmail, getAlertRecipients, getSiteName } from "../_shared/emailConfig.ts";

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

interface ConfirmationEmailRequest {
  orgName: string;
  contactName: string;
  orgEmail: string;
  opportunityType: string;
  roleClassification: string;
  positionTitle: string | null;
  additionalRequirements: string | null;
  description: string;
  location: string;
  onBusRoute: boolean;
  hoursAvailable: string;
  daysTimesAvailable: string;
  editToken: string;
  siteUrl: string;
  // Education-specific fields
  programName?: string | null;
  website?: string | null;
  programComponents?: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Confirmation email function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ConfirmationEmailRequest = await req.json();
    const {
      orgName,
      contactName,
      orgEmail,
      opportunityType,
      roleClassification,
      positionTitle,
      additionalRequirements,
      description,
      location,
      onBusRoute,
      hoursAvailable,
      daysTimesAvailable,
      editToken,
      siteUrl,
      programName,
      website,
      programComponents,
    } = body;

    console.log(`Sending confirmation email to ${orgEmail}`);

    const editUrl = `${siteUrl}/edit-opportunity/${editToken}`;
    const isEducation = opportunityType === "Education & Training";

    const listingDetailsHtml = isEducation
      ? `<p style="margin:0 0 8px 0;"><strong>Organization:</strong> ${escapeHtml(orgName)}</p>
<p style="margin:0 0 8px 0;"><strong>Program Name:</strong> ${escapeHtml(programName || "Not specified")}</p>
<p style="margin:0 0 8px 0;"><strong>Description:</strong> ${escapeHtml(description)}</p>
<p style="margin:0 0 8px 0;"><strong>Website:</strong> <a href="${escapeHtml(website)}" style="color:#1e3a5f;">${escapeHtml(website)}</a></p>
<p style="margin:0 0 8px 0;"><strong>Program Components:</strong> ${escapeHtml(programComponents || "Not specified")}</p>
<p style="margin:0 0 8px 0;"><strong>Hours Available per Week:</strong> ${escapeHtml(hoursAvailable)}</p>
${additionalRequirements ? `<p style="margin:0 0 0 0;"><strong>Minimum Requirements:</strong> ${escapeHtml(additionalRequirements)}</p>` : ""}`
      : `<p style="margin:0 0 8px 0;"><strong>Type:</strong> ${escapeHtml(opportunityType)}</p>
<p style="margin:0 0 8px 0;"><strong>Role Classification:</strong> ${escapeHtml(roleClassification || "Not specified")}</p>
${positionTitle ? `<p style="margin:0 0 8px 0;"><strong>Position Title:</strong> ${escapeHtml(positionTitle)}</p>` : ""}
<p style="margin:0 0 8px 0;"><strong>Description:</strong> ${escapeHtml(description)}</p>
<p style="margin:0 0 8px 0;"><strong>Location:</strong> ${escapeHtml(location)}</p>
<p style="margin:0 0 8px 0;"><strong>On Bus Route:</strong> ${onBusRoute ? "Yes" : "No"}</p>
<p style="margin:0 0 8px 0;"><strong>Hours Available:</strong> ${escapeHtml(hoursAvailable)}</p>
<p style="margin:0 0 8px 0;"><strong>Days/Times Available:</strong> ${escapeHtml(daysTimesAvailable)}</p>
${additionalRequirements ? `<p style="margin:0 0 0 0;"><strong>Standard Requirements:</strong> ${escapeHtml(additionalRequirements)}</p>` : ""}`;

    const whatHappensNextHtml = isEducation
      ? ""
      : `<!-- What Happens Next Card -->
<div style="background-color:#e6f7e6; border-left:4px solid #2e7d32; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#2e7d32;">What Happens Next?</h2>
<p style="margin:0 0 8px 0;">1. Clients can apply directly through the platform</p>
<p style="margin:0 0 8px 0;">2. You will receive a notification to this email when someone applies</p>
<p style="margin:0 0 8px 0;">3. Contact applicants to confirm availability and interest</p>
<p style="margin:0 0 8px 0;">4. Remove your posting when the position has been filled</p>
<p style="margin:0 0 0 0;">5. Complete monthly documentation on behalf of the volunteer</p>
</div>`;

    const introText = isEducation
      ? "Your opportunity has been successfully published. Use this email to review your post and edit the listing with any corrections OR to remove the posting."
      : "Your opportunity has been successfully published. Use this email to review your post and edit the listing with any corrections OR to remove the posting when the opportunity is filled.";

    const updateRemoveText = isEducation
      ? "Need to make changes or remove your listing? You can use the edit button below to update your listing or remove it. The listing will remain active until you remove it."
      : "Need to make changes or remove your listing? You can use the edit button below to update available hours or remove the listing when the position is filled.";

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Listing Confirmation</title>
</head>
<body style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.6; color:#333333; background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">
<tr>
<td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; max-width:600px; border-radius:8px; overflow:hidden;">

<!-- Header -->
<tr>
${isEducation
? `<td style="background-color:#1e3a5f; padding:30px; text-align:center;">
<h1 style="margin:0; font-size:28px; color:#ffffff;">Listing Confirmation</h1>
</td>`
: `<td style="background-color:#1e3a5f; padding:30px; text-align:center;">
<h1 style="margin:0; font-size:28px; color:#ffffff;">⭐ Thank You for Supporting<br>Our Community ⭐</h1>
</td>`}
</tr>

<!-- Main Content -->
<tr>
<td style="padding:30px;">

<p style="margin:0 0 25px 0;">${introText}</p>

<!-- Your Listing Details Card -->
<div style="background-color:#f0f7ff; border-left:4px solid #1e3a5f; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#1e3a5f;">Your Listing Details</h2>
${listingDetailsHtml}
</div>

${whatHappensNextHtml}

${isEducation
? `<!-- Update or Remove Card - Education (Green) -->
<div style="background-color:#e6f7e6; border-left:4px solid #2e7d32; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#2e7d32;">Update or Remove Your Listing</h2>
<p style="margin:0 0 15px 0;">${updateRemoveText}</p>
<p style="margin:0 0 15px 0; text-align:center;">
<a href="${editUrl}" style="display:inline-block; padding:14px 28px; background-color:#2e7d32; color:#ffffff; text-decoration:none; font-weight:bold; border-radius:6px;">Edit Your Listing</a>
</p>
<p style="margin:0; font-size:13px; color:#666666; text-align:center;">This link is unique to your listing. Please keep it safe and do not share it publicly.</p>
</div>

<!-- Need Help Card - Education (Orange) -->
<div style="background-color:#fff0e6; border-left:4px solid #e67e22; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#e67e22;">Need Help?</h2>
<p style="margin:0;">For additional assistance, please email: <a href="mailto:${getSupportEmail()}" style="color:#1e3a5f; font-weight:bold;">${getSupportEmail()}</a></p>
</div>`
: `<!-- Update or Remove Card - Volunteer (Orange) -->
<div style="background-color:#fff0e6; border-left:4px solid #e67e22; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#e67e22;">Update or Remove Your Listing</h2>
<p style="margin:0 0 15px 0;">${updateRemoveText}</p>
<p style="margin:0 0 15px 0; text-align:center;">
<a href="${editUrl}" style="display:inline-block; padding:14px 28px; background-color:#e67e22; color:#ffffff; text-decoration:none; font-weight:bold; border-radius:6px;">Edit Your Listing</a>
</p>
<p style="margin:0; font-size:13px; color:#666666; text-align:center;">This link is unique to your listing. Please keep it safe and do not share it publicly.</p>
</div>`}


</td>
</tr>

<!-- Footer -->
<tr>
${isEducation
? `<td style="background-color:#1e3a5f; padding:25px; text-align:center;">
<p style="margin:0 0 5px 0; color:#ffffff; font-size:16px;">⭐ Thank You for Supporting Our Community! ⭐</p>
<p style="margin:0; color:#a0c4e8; font-size:14px; font-weight:bold;">Tompkins County Opportunity Finder</p>
</td>`
: `<td style="background-color:#1e3a5f; padding:25px; text-align:center;">
<p style="margin:0 0 5px 0; color:#ffffff; font-size:16px;">Need Help?</p>
<p style="margin:0; color:#a0c4e8; font-size:14px;">Contact us at <a href="mailto:${getSupportEmail()}" style="color:#ffffff; font-weight:bold;">${getSupportEmail()}</a></p>
</td>`}
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;

    const subjectTitle = isEducation
      ? `${programName || "Program"} - Listing Confirmation`
      : `${positionTitle || "Opportunity"} Role - Listing Confirmation`;

    const emailResponse = await resend.emails.send({
      from: getFromEmail(),
      to: [orgEmail],
      subject: subjectTitle,
      html: emailHtml,
    });

    console.log("Confirmation email sent successfully:", emailResponse);

    await notifyGoogleChat({
      icon: "📝",
      title: isEducation ? "New education listing submitted" : "New volunteer listing submitted",
      fields: [
        { label: "Organization", value: orgName || "Unknown" },
        {
          label: isEducation ? "Program" : "Position",
          value: (isEducation ? programName : positionTitle) || "Not specified",
        },
        { label: "Contact", value: orgEmail || "Not provided" },
      ],
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
