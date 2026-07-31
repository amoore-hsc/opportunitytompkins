import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

interface Opportunity {
  id: string;
  type: string;
  position_title: string | null;
  description: string;
  location: string;
  on_bus_route: boolean;
  hours_available: string;
  days_times_available: string;
  additional_requirements: string | null;
  org_name: string;
  org_email: string;
  org_phone: string;
  role_classification: string | null;
  updated_at: string;
  program_name: string | null;
  website: string | null;
  program_components: string | null;
}

interface OpportunitiesEmailRequest {
  email: string;
  opportunities: Opportunity[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, opportunities }: OpportunitiesEmailRequest = await req.json();

    console.log(`Sending opportunities email to: ${email}`);
    console.log(`Number of opportunities: ${opportunities.length}`);

    const siteUrl = Deno.env.get("SITE_URL") || "https://oosxopnxaivfdtksrvam.lovableproject.com";
    
    const opportunitiesHtml = opportunities.map((opp) => `
<div style="background-color:#f0f7ff; border-left:4px solid #1e3a5f; padding:20px; margin:0 0 20px 0; border-radius:0 8px 8px 0;">
<p style="margin:0 0 8px 0;"><span style="display:inline-block; background-color:${opp.type === 'education' ? '#2d4a6f' : '#1e3a5f'}; color:white; padding:3px 10px; border-radius:4px; font-size:13px; font-weight:bold;">${opp.type === 'volunteer' ? 'Volunteer' : 'Education & Training'}</span>${opp.type === 'volunteer' && opp.on_bus_route ? ' <span style="background-color:#2e7d32; color:white; padding:3px 10px; border-radius:4px; font-size:13px; font-weight:bold;">🚌 On Bus Route</span>' : ''}</p>
${opp.type === 'volunteer' && opp.role_classification ? `<p style="margin:0 0 8px 0;"><span style="display:inline-block; border:1px solid #ccc; padding:3px 10px; border-radius:4px; font-size:13px;">${escapeHtml(opp.role_classification)}</span></p>` : ''}
${opp.type === 'education' && opp.program_components ? `<p style="margin:0 0 8px 0;">${opp.program_components.split(', ').map(c => `<span style="display:inline-block; border:1px solid #ccc; padding:3px 10px; border-radius:4px; font-size:13px; margin-right:4px; margin-bottom:4px;">${escapeHtml(c)}</span>`).join('')}</p>` : ''}
<h3 style="margin:0 0 5px 0; font-size:18px; color:#1e3a5f;">${escapeHtml(opp.org_name)}</h3>
${opp.type === 'volunteer' && opp.position_title ? `<p style="margin:0 0 5px 0; font-size:15px; font-weight:600;">${escapeHtml(opp.position_title)}</p>` : ''}
${opp.type === 'education' && opp.program_name ? `<p style="margin:0 0 5px 0; font-size:15px; font-weight:600;">${escapeHtml(opp.program_name)}</p>` : ''}
<p style="margin:0 0 12px 0; color:#666;">${escapeHtml(opp.description)}</p>
${opp.type === 'volunteer' && opp.location && opp.location !== 'N/A' ? `<p style="margin:0 0 8px 0;">📍 <strong>Location:</strong> ${escapeHtml(opp.location)}</p>` : ''}

<p style="margin:0 0 8px 0;">🕐 <strong>Hours Available:</strong> ${escapeHtml(opp.hours_available)} per week</p>
${opp.days_times_available && opp.days_times_available !== 'N/A' ? `<p style="margin:0 0 8px 0;">📅 <strong>${opp.type === 'education' ? 'Schedule' : 'Days/Times'}:</strong> ${escapeHtml(opp.days_times_available)}</p>` : ''}
${opp.additional_requirements ? `<p style="margin:0 0 8px 0;">📋 <strong>${opp.type === 'education' ? 'Minimum Requirements' : 'Additional Requirements'}:</strong> ${escapeHtml(opp.additional_requirements)}</p>` : ''}
<p style="margin:0 0 12px 0; font-size:12px; color:#999;">Updated ${new Date(opp.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
<div style="text-align:center;">
${opp.type === 'education' && opp.website
  ? `<a href="${escapeHtml(opp.website.startsWith('http') ? opp.website : 'https://' + opp.website)}" style="display:inline-block; background-color:#1e3a5f; color:white; text-decoration:none; padding:12px 30px; border-radius:6px; font-weight:bold; font-size:14px;">Program Website</a>`
  : `<a href="${siteUrl}/opportunities?id=${encodeURIComponent(opp.id)}" style="display:inline-block; background-color:#1e3a5f; color:white; text-decoration:none; padding:12px 30px; border-radius:6px; font-weight:bold; font-size:14px;">Apply Now</a>`}
</div>
</div>
    `).join('');

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Opportunities</title>
</head>
<body style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.6; color:#333333; background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">
<tr>
<td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; max-width:600px; border-radius:8px; overflow:hidden;">

<!-- Header -->
<tr>
<td style="background-color:#1e3a5f; padding:30px; text-align:center;">
<h1 style="margin:0; font-size:28px; color:#ffffff;">Shared Opportunities</h1>
</td>
</tr>

<!-- Main Content -->
<tr>
<td style="padding:30px;">

<p style="margin:0 0 25px 0;">Here ${opportunities.length === 1 ? 'is' : 'are'} the ${opportunities.length} ${opportunities.length === 1 ? 'opportunity' : 'opportunities'} that matched your filters:</p>

<!-- Opportunities List -->
${opportunitiesHtml}


</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color:#1e3a5f; padding:25px; text-align:center;">
<p style="margin:0 0 5px 0; color:#ffffff; font-size:16px;">Need Help?</p>
<p style="margin:0; color:#a0c4e8; font-size:14px;"><a href="mailto:amoore@hsctc.org" style="color:#ffffff; font-weight:bold;">Contact Us</a></p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;

    const emailResponse = await resend.emails.send({
      from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
      to: [email],
      subject: `Shared Opportunities`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-opportunities-email function:", error);
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
