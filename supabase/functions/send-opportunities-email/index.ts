import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Opportunity {
  id: string;
  type: string;
  description: string;
  location: string;
  on_bus_route: boolean;
  hours_available: string;
  days_times_available: string;
  additional_requirements: string | null;
  org_name: string;
  org_email: string;
  org_phone: string;
  website: string | null;
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
    
    // Generate HTML for opportunities list
    const opportunitiesHtml = opportunities.map((opp) => `
<div style="background-color:#f0f7ff; border-left:4px solid #1e3a5f; padding:20px; margin:0 0 20px 0; border-radius:0 8px 8px 0;">
<h3 style="margin:0 0 15px 0; font-size:18px; color:#1e3a5f;">${opp.org_name}</h3>
<p style="margin:0 0 8px 0;"><strong>Type:</strong> ${opp.type === 'volunteer' ? 'Volunteer' : opp.type === 'education' ? 'Education & Training' : opp.type}</p>
<p style="margin:0 0 8px 0;"><strong>Location:</strong> ${opp.location}${opp.on_bus_route ? ' <span style="background-color:#2e7d32; color:white; padding:4px 10px; border-radius:4px; font-size:13px; font-weight:bold;">On Bus Route</span>' : ''}</p>
<p style="margin:0 0 8px 0;"><strong>Hours Available:</strong> ${opp.hours_available}</p>
<p style="margin:0 0 8px 0;"><strong>Days/Times:</strong> ${opp.days_times_available}</p>
<p style="margin:0 0 8px 0;"><strong>Description:</strong> ${opp.description}</p>
${opp.additional_requirements ? `<p style="margin:0 0 8px 0;"><strong>Requirements:</strong> ${opp.additional_requirements}</p>` : ''}
<div style="margin-top:15px; text-align:center;">
${opp.type === 'education' && opp.website
  ? `<a href="${opp.website}" style="display:inline-block; background-color:#1e3a5f; color:white; text-decoration:none; padding:12px 30px; border-radius:6px; font-weight:bold; font-size:14px;">Program Website</a>`
  : `<a href="${siteUrl}/opportunities?id=${opp.id}" style="display:inline-block; background-color:#1e3a5f; color:white; text-decoration:none; padding:12px 30px; border-radius:6px; font-weight:bold; font-size:14px;">Apply Now</a>`}
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
<p style="margin:0; color:#a0c4e8; font-size:14px;"><a href="mailto:rhinton@uwtc.org" style="color:#ffffff; font-weight:bold;">Contact Us</a></p>
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
