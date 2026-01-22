import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Opportunity {
  id: string;
  org_name: string;
  org_email: string;
  position_title: string | null;
  type: string;
  description: string;
  created_at: string;
  edit_token: string;
  contact_name: string | null;
}

interface ApplicationCount {
  opportunity_id: string;
  count: number;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function generateEmail(
  opportunity: Opportunity, 
  applicationCount: number, 
  siteUrl: string
): string {
  const editUrl = `${siteUrl}/edit-opportunity?token=${opportunity.edit_token}`;
  const contactName = opportunity.contact_name || 'there';
  const positionTitle = opportunity.position_title || opportunity.type;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Outreach Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1e3a5f; padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">
                Outreach Reminder
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              
              <p style="margin: 0 0 20px 0;">Hi ${contactName},</p>
              
              <p style="margin: 0 0 25px 0;">
                We're excited to share that your <strong>${positionTitle}</strong> listing 
                has been generating interest since it was posted on ${formatDate(opportunity.created_at)}!
              </p>
              
              <!-- Success Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 25px;">
                <tr>
                  <td style="border-left: 4px solid #22c55e; background-color: #f0fdf4; padding: 20px;">
                    <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 18px;">
                      🎉 ${applicationCount} ${applicationCount === 1 ? 'Application' : 'Applications'} Received!
                    </h3>
                    <p style="margin: 0; color: #333333;">
                      Your listing has received ${applicationCount} ${applicationCount === 1 ? 'application' : 'applications'} in the first 2 weeks.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Next Steps Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 25px;">
                <tr>
                  <td style="border-left: 4px solid #3b82f6; background-color: #eff6ff; padding: 20px;">
                    <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Suggested Next Steps</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #333333;">
                      <li style="margin-bottom: 8px;">Review any applications you've received and follow up with the applicants within 2 weeks</li>
                      <li style="margin-bottom: 8px;">If you've filled the position, please update or deactivate your listing</li>
                      <li style="margin-bottom: 0;">Keep your listing details current to attract qualified volunteers</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <!-- Edit Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 25px;">
                <tr>
                  <td align="center">
                    <a href="${editUrl}" 
                       style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: bold;">
                      Review or Update Your Listing
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0;">
                Thank you for being part of the Tompkins Opportunity network!
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1e3a5f; padding: 25px; text-align: center;">
              <p style="margin: 0 0 5px 0; color: #ffffff; font-size: 16px;">Need Help?</p>
              <p style="margin: 0; color: #a0c4e8; font-size: 14px;"><a href="mailto:rhinton@uwtc.org" style="color: #ffffff; font-weight: bold;">Contact Us</a></p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = Deno.env.get("SITE_URL") || "https://tompkins-opportunity.org";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for test mode
    let testMode = false;
    let testEmail = "";
    
    if (req.method === "POST") {
      try {
        const body = await req.json();
        testMode = body.testMode === true;
        testEmail = body.testEmail || "";
      } catch {
        // Not JSON or empty body, continue with normal mode
      }
    }

    if (testMode) {
      if (!testEmail) {
        return new Response(
          JSON.stringify({ error: "testEmail is required in test mode" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Running in TEST MODE - sending to ${testEmail}`);

      // Fetch a sample opportunity for testing
      const { data: sampleOpp, error: sampleError } = await supabase
        .from("opportunities")
        .select("*")
        .eq("active", true)
        .limit(1)
        .single();

      if (sampleError || !sampleOpp) {
        return new Response(
          JSON.stringify({ error: "No active opportunities found for test" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const testHtml = generateEmail(sampleOpp as Opportunity, 5, siteUrl);

      const { error: emailError } = await resend.emails.send({
        from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
        to: [testEmail],
        subject: `Great News! Interest In Your Listing`,
        html: testHtml,
      });

      if (emailError) {
        console.error("Error sending test email:", emailError);
        return new Response(
          JSON.stringify({ error: emailError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Test email sent successfully to ${testEmail}`);
      return new Response(
        JSON.stringify({ success: true, message: `Test email sent to ${testEmail}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Production mode: Find opportunities that are 14-21 days old with applications
    console.log("Starting interest notification check...");

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

    // Get active opportunities created 14-21 days ago that haven't been notified
    const { data: eligibleOpportunities, error: oppError } = await supabase
      .from("opportunities")
      .select("id, org_name, org_email, position_title, type, description, created_at, edit_token, contact_name")
      .eq("active", true)
      .is("interest_notification_sent_at", null)
      .lte("created_at", fourteenDaysAgo.toISOString())
      .gte("created_at", twentyOneDaysAgo.toISOString());

    if (oppError) {
      console.error("Error fetching opportunities:", oppError);
      throw oppError;
    }

    if (!eligibleOpportunities || eligibleOpportunities.length === 0) {
      console.log("No eligible opportunities found for interest notification");
      return new Response(
        JSON.stringify({ success: true, message: "No eligible opportunities found", emailsSent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${eligibleOpportunities.length} potentially eligible opportunities`);

    // Get application counts for these opportunities within their first 14 days
    const opportunityIds = eligibleOpportunities.map(o => o.id);
    
    const { data: applicationCounts, error: countError } = await supabase
      .from("application_counts")
      .select("opportunity_id, count")
      .in("opportunity_id", opportunityIds);

    if (countError) {
      console.error("Error fetching application counts:", countError);
      throw countError;
    }

    // Sum up application counts per opportunity
    const countsByOpportunity: Record<string, number> = {};
    if (applicationCounts) {
      for (const ac of applicationCounts) {
        countsByOpportunity[ac.opportunity_id] = (countsByOpportunity[ac.opportunity_id] || 0) + ac.count;
      }
    }

    // Filter to only opportunities with at least 1 application
    const opportunitiesWithApplications = eligibleOpportunities.filter(
      opp => (countsByOpportunity[opp.id] || 0) > 0
    );

    if (opportunitiesWithApplications.length === 0) {
      console.log("No opportunities with applications found in the 14-21 day window");
      return new Response(
        JSON.stringify({ success: true, message: "No opportunities with applications found", emailsSent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${opportunitiesWithApplications.length} opportunities with applications to notify`);

    let emailsSent = 0;
    const errors: string[] = [];

    for (const opportunity of opportunitiesWithApplications) {
      const applicationCount = countsByOpportunity[opportunity.id] || 0;
      const positionTitle = opportunity.position_title || opportunity.type;

      try {
        const emailHtml = generateEmail(opportunity as Opportunity, applicationCount, siteUrl);

        const { error: emailError } = await resend.emails.send({
          from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
          to: [opportunity.org_email],
          subject: `Great News! Interest In Your Listing`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Error sending email to ${opportunity.org_email}:`, emailError);
          errors.push(`Failed to email ${opportunity.org_email}: ${emailError.message}`);
          continue;
        }

        // Update the notification timestamp
        const { error: updateError } = await supabase
          .from("opportunities")
          .update({ interest_notification_sent_at: new Date().toISOString() })
          .eq("id", opportunity.id);

        if (updateError) {
          console.error(`Error updating notification timestamp for ${opportunity.id}:`, updateError);
          errors.push(`Failed to update timestamp for opportunity ${opportunity.id}`);
        } else {
          emailsSent++;
          console.log(`Successfully sent interest notification to ${opportunity.org_email} for "${positionTitle}" (${applicationCount} applications)`);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Unexpected error processing opportunity ${opportunity.id}:`, err);
        errors.push(`Unexpected error for opportunity ${opportunity.id}: ${errorMessage}`);
      }
    }

    console.log(`Interest notification complete. Sent ${emailsSent} emails.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${emailsSent} interest notification emails`,
        emailsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-interest-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
