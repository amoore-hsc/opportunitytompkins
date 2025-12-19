import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplicationEmailRequest {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  hoursRequested: string;
  orgEmail: string;
  orgName: string;
  contactName: string;
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
      orgEmail, 
      orgName,
      contactName,
      opportunityDescription,
      opportunityType,
      positionTitle,
      opportunityId
    }: ApplicationEmailRequest = await req.json();

    console.log(`Sending application email to ${orgEmail} from ${clientName}`);

    // Track application count (aggregated, no personal data stored)
    if (opportunityId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
        
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
<h1 style="margin:0; font-size:28px; color:#ffffff;">⭐ New Client Application ⭐</h1>
</td>
</tr>

<!-- Main Content -->
<tr>
<td style="padding:30px;">

<p style="margin:0 0 25px 0;">You have received a new application through Tompkins County Opportunity Finder.</p>

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
<p style="margin:0 0 8px 0;">&bull; Contact the applicant to confirm their availability and interest</p>
<p style="margin:0 0 8px 0;">&bull; Complete monthly documentation on behalf of the volunteer</p>
<p style="margin:0 0 0 0;">&bull; Remove your posting when the position has been filled using the edit link from your confirmation email</p>
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

    const emailResponse = await resend.emails.send({
      from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
      to: [orgEmail],
      subject: `New Application - ${positionTitle || 'Position'}`,
      html: emailHtml,
    });

    console.log("Application email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
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