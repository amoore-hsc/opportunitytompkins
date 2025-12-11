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
  location: string;
  role_classification: string | null;
  hours_available: string;
  days_times_available: string;
  created_at: string;
  edit_token: string;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const getDaysSinceCreation = (createdAt: string): number => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-listing-reminder function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query opportunities that need reminders:
    // - Active listings
    // - Created 60+ days ago
    // - No updates since creation (updated_at equals created_at)
    // - No reminder sent yet
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    console.log(`Looking for opportunities created before: ${sixtyDaysAgo.toISOString()}`);

    const { data: opportunities, error: fetchError } = await supabase
      .from("opportunities")
      .select("id, org_name, org_email, position_title, type, description, location, role_classification, hours_available, days_times_available, created_at, edit_token, updated_at")
      .eq("active", true)
      .is("reminder_sent_at", null)
      .lte("created_at", sixtyDaysAgo.toISOString());

    if (fetchError) {
      console.error("Error fetching opportunities:", fetchError);
      throw new Error(`Failed to fetch opportunities: ${fetchError.message}`);
    }

    // Filter to only include listings where updated_at equals created_at (no updates)
    const eligibleOpportunities = (opportunities || []).filter((opp: any) => {
      const createdAt = new Date(opp.created_at).getTime();
      const updatedAt = new Date(opp.updated_at).getTime();
      // Allow for small time differences (within 1 second)
      return Math.abs(createdAt - updatedAt) < 1000;
    }) as Opportunity[];

    console.log(`Found ${eligibleOpportunities.length} opportunities needing reminders`);

    if (eligibleOpportunities.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No opportunities need reminders at this time",
          reminders_sent: 0
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://oosxopnxaivfdtksrvam.lovableproject.com";
    let remindersSent = 0;
    const errors: string[] = [];

    // Process each eligible opportunity
    for (const opportunity of eligibleOpportunities) {
      const editUrl = `${siteUrl}/edit-opportunity/${opportunity.edit_token}`;
      const daysSinceCreation = getDaysSinceCreation(opportunity.created_at);
      const positionTitle = opportunity.position_title || opportunity.type;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Listing Reminder</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="background-color: #1e3a5f; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📋 Your Listing is Still Active</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Dear <strong>${opportunity.org_name}</strong>,
              </p>
              
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Your opportunity listing "<strong>${positionTitle}</strong>" has been active on the Tompkins County Opportunity Finder for <strong>${daysSinceCreation} days</strong>.
              </p>
              
              <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
                We wanted to check in to make sure this listing is still current and available for applicants.
              </p>
              
              <!-- Listing Details Box -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #1e3a5f;">
                <h3 style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 16px;">Your Listing Details:</h3>
                <table style="width: 100%; font-size: 14px; color: #555;">
                  <tr>
                    <td style="padding: 5px 0; font-weight: bold; width: 40%;">Type:</td>
                    <td style="padding: 5px 0;">${opportunity.type}</td>
                  </tr>
                  ${opportunity.position_title ? `
                  <tr>
                    <td style="padding: 5px 0; font-weight: bold;">Position:</td>
                    <td style="padding: 5px 0;">${opportunity.position_title}</td>
                  </tr>
                  ` : ''}
                  ${opportunity.role_classification ? `
                  <tr>
                    <td style="padding: 5px 0; font-weight: bold;">Classification:</td>
                    <td style="padding: 5px 0;">${opportunity.role_classification}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 5px 0; font-weight: bold;">Location:</td>
                    <td style="padding: 5px 0;">${opportunity.location}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; font-weight: bold;">Posted:</td>
                    <td style="padding: 5px 0;">${formatDate(opportunity.created_at)}</td>
                  </tr>
                </table>
              </div>
              
              <!-- What You Can Do -->
              <div style="margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 16px;">What You Can Do:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px; line-height: 1.8;">
                  <li><strong>Update your listing</strong> if availability or details have changed</li>
                  <li><strong>Remove the listing</strong> if the position has been filled</li>
                  <li><strong>No action needed</strong> if everything is still current</li>
                </ul>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${editUrl}" style="display: inline-block; background-color: #84cc16; color: #1e3a5f; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Edit Your Listing
                </a>
              </div>
              
              <p style="font-size: 12px; color: #888; text-align: center; margin-bottom: 25px;">
                This link is unique to your listing. Please keep it safe.
              </p>
              
              <!-- Help Section -->
              <div style="background-color: #f0f9ff; border-radius: 8px; padding: 15px; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: #555;">
                  <strong>Questions?</strong><br>
                  Contact <a href="mailto:rhinton@uwtc.org" style="color: #1e3a5f;">rhinton@uwtc.org</a>
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #1e3a5f; padding: 20px; text-align: center;">
              <p style="color: #ffffff; margin: 0; font-size: 14px;">
                Thank you for supporting our community!
              </p>
              <p style="color: #a0aec0; margin: 10px 0 0 0; font-size: 12px;">
                Tompkins County Opportunity Finder
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `;

      try {
        console.log(`Sending reminder to ${opportunity.org_email} for opportunity ${opportunity.id}`);

        const emailResponse = await resend.emails.send({
          from: "Tompkins County Opportunity Finder <onboarding@resend.dev>",
          to: [opportunity.org_email],
          subject: `Reminder: Your "${positionTitle}" Listing Has Been Active for ${daysSinceCreation} Days`,
          html: emailHtml,
        });

        console.log(`Email sent successfully to ${opportunity.org_email}:`, emailResponse);

        // Update reminder_sent_at timestamp
        const { error: updateError } = await supabase
          .from("opportunities")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", opportunity.id);

        if (updateError) {
          console.error(`Error updating reminder_sent_at for ${opportunity.id}:`, updateError);
          errors.push(`Failed to update reminder_sent_at for ${opportunity.id}`);
        } else {
          remindersSent++;
        }

      } catch (emailError: any) {
        console.error(`Error sending email to ${opportunity.org_email}:`, emailError);
        errors.push(`Failed to send email to ${opportunity.org_email}: ${emailError.message}`);
      }
    }

    console.log(`Reminder process complete. Sent ${remindersSent} reminders.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${remindersSent} reminder emails`,
        reminders_sent: remindersSent,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-listing-reminder function:", error);
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
