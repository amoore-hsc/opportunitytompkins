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
  contact_name: string | null;
  org_email: string;
  position_title: string | null;
  type: string;
  description: string;
  location: string;
  role_classification: string | null;
  hours_available: string;
  days_times_available: string;
  additional_requirements: string | null;
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

const generateListingBlock = (opportunity: Opportunity, editUrl: string, confirmUrl: string): string => {
  const daysSinceCreation = getDaysSinceCreation(opportunity.created_at);
  const positionTitle = opportunity.position_title || opportunity.type;
  
  return `
    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #1e3a5f;">
      <h3 style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 18px;">${positionTitle}</h3>
      <table style="width: 100%; font-size: 14px; color: #555; margin-bottom: 15px;">
        <tr>
          <td style="padding: 5px 0; font-weight: bold; width: 40%;">Location:</td>
          <td style="padding: 5px 0;">${opportunity.location}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold;">Hours Available:</td>
          <td style="padding: 5px 0;">${opportunity.hours_available}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold;">Days/Times Available:</td>
          <td style="padding: 5px 0;">${opportunity.days_times_available}</td>
        </tr>
        ${opportunity.additional_requirements ? `
        <tr>
          <td style="padding: 5px 0; font-weight: bold;">Requirements:</td>
          <td style="padding: 5px 0;">${opportunity.additional_requirements}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 5px 0; font-weight: bold;">Posted:</td>
          <td style="padding: 5px 0;">${formatDate(opportunity.created_at)} (${daysSinceCreation} days ago)</td>
        </tr>
      </table>
      <div style="text-align: center;">
        <a href="${confirmUrl}" style="display: inline-block; background-color: #2e7d32; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; margin-right: 10px;">
          Confirm Still Active
        </a>
        <a href="${editUrl}" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px;">
          Edit This Listing
        </a>
      </div>
    </div>
  `;
};

const generateConsolidatedEmail = (opportunities: Opportunity[], siteUrl: string): string => {
  const listingBlocks = opportunities.map(opp => {
    const editUrl = `${siteUrl}/edit-opportunity/${opp.edit_token}`;
    const confirmUrl = `${siteUrl}/confirm-listing/${opp.edit_token}`;
    return generateListingBlock(opp, editUrl, confirmUrl);
  }).join('');

  const listingCount = opportunities.length;
  const listingWord = listingCount === 1 ? 'listing' : 'listings';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Listing Reminder</title>
</head>
<body style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.6; color:#333333; background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">
<tr>
<td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; max-width:600px; border-radius:8px; overflow:hidden;">

<!-- Header -->
<tr>
<td style="background-color:#1e3a5f; padding:30px; text-align:center;">
<h1 style="margin:0; font-size:28px; color:#ffffff;">Your ${listingWord === 'listings' ? 'Listings Need' : 'Listing Needs'}<br>Attention</h1>
</td>
</tr>

<!-- Main Content -->
<tr>
<td style="padding:30px;">

<p style="margin:0 0 25px 0;">You have <strong>${listingCount} ${listingWord}</strong> on Tompkins Opportunity that ${listingCount === 1 ? 'has' : 'have'} been active for 60+ days without updates.</p>

<!-- Action Items Card -->
<div style="background-color:#e6f7e6; border-left:4px solid #2e7d32; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#2e7d32;">Action Items</h2>
<p style="margin:0 0 8px 0;">&bull; <strong>Confirm your listing</strong> if everything is still accurate, using the Confirm Still Active button below.</p>
<p style="margin:0 0 8px 0;">&bull; <strong>Update your listing</strong> if availability or details have changed, using the Edit This Listing button below.</p>
<p style="margin:0 0 0 0;">&bull; <strong>Remove the listing</strong> if the position has been filled, using the Edit This Listing button below. Scroll to the bottom of the page to deactivate the listing.</p>
</div>

<!-- Listing Blocks -->
${listingBlocks}

<p style="margin:0 0 0 0; font-size:13px; color:#666666; text-align:center;">Each edit link is unique to its listing. Please keep them safe.</p>

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
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-listing-reminder function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for test mode
    let testMode = false;
    let testEmail = "";
    
    if (req.method === "POST") {
      try {
        const body = await req.json();
        testMode = body.testMode === true;
        testEmail = body.email || "";
      } catch {
        // No body or invalid JSON, continue with normal mode
      }
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://oosxopnxaivfdtksrvam.lovableproject.com";

    // Test mode: send dummy data email
    if (testMode && testEmail) {
      console.log(`Test mode: sending dummy reminder to ${testEmail}`);
      
      const dummyOpportunities: Opportunity[] = [
        {
          id: "test-1",
          org_name: "Sample Organization",
          contact_name: "Jane Smith",
          org_email: testEmail,
          position_title: "Office Assistant",
          type: "Job",
          description: "General office duties including filing, data entry, and customer service.",
          location: "123 Main Street, Ithaca, NY",
          role_classification: "Administrative",
          hours_available: "Part-time (20 hours/week)",
          days_times_available: "Monday-Friday, 9am-1pm",
          additional_requirements: "Must have valid driver's license",
          created_at: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(), // 75 days ago
          edit_token: "test-token-123"
        },
        {
          id: "test-2",
          org_name: "Sample Organization",
          contact_name: "Jane Smith",
          org_email: testEmail,
          position_title: "Volunteer Coordinator",
          type: "Volunteer",
          description: "Help coordinate volunteer activities and community outreach programs.",
          location: "456 Community Center Dr, Ithaca, NY",
          role_classification: "Community Service",
          hours_available: "Flexible (10-15 hours/week)",
          days_times_available: "Weekends preferred",
          additional_requirements: null,
          created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
          edit_token: "test-token-456"
        }
      ];

      const emailHtml = generateConsolidatedEmail(dummyOpportunities, siteUrl);
      
      const emailResponse = await resend.emails.send({
        from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
        to: [testEmail],
        subject: `[TEST] Reminder: Your 2 Listings Need Attention`,
        html: emailHtml,
      });

      console.log("Test email sent successfully:", emailResponse);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Test reminder email sent to ${testEmail}`,
          testMode: true,
          emailResponse
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

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
      .select("id, org_name, contact_name, org_email, position_title, type, description, location, role_classification, hours_available, days_times_available, additional_requirements, created_at, edit_token, updated_at")
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
          reminders_sent: 0,
          emails_sent: 0
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Group opportunities by org_email
    const groupedByEmail = new Map<string, Opportunity[]>();
    for (const opp of eligibleOpportunities) {
      const email = opp.org_email.toLowerCase();
      if (!groupedByEmail.has(email)) {
        groupedByEmail.set(email, []);
      }
      groupedByEmail.get(email)!.push(opp);
    }

    console.log(`Grouped into ${groupedByEmail.size} unique contact emails`);

    // siteUrl already defined above
    let emailsSent = 0;
    let listingsUpdated = 0;
    const errors: string[] = [];

    // Process each email group
    for (const [email, opps] of groupedByEmail) {
      try {
        console.log(`Sending consolidated reminder to ${email} for ${opps.length} listing(s)`);

        const emailHtml = generateConsolidatedEmail(opps, siteUrl);
        
        // Generate subject line
        const listingCount = opps.length;
        const subject = listingCount === 1
          ? `Reminder: Your "${opps[0].position_title || opps[0].type}" Listing Has Been Active for 60+ Days`
          : `Reminder: Your ${listingCount} Listings Need Attention`;

        const emailResponse = await resend.emails.send({
          from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
          to: [email],
          subject: subject,
          html: emailHtml,
        });

        console.log(`Email sent successfully to ${email}:`, emailResponse);
        emailsSent++;

        // Update reminder_sent_at for all opportunities in this group
        const oppIds = opps.map(o => o.id);
        const { error: updateError } = await supabase
          .from("opportunities")
          .update({ reminder_sent_at: new Date().toISOString() })
          .in("id", oppIds);

        if (updateError) {
          console.error(`Error updating reminder_sent_at for opportunities:`, updateError);
          errors.push(`Failed to update reminder_sent_at for ${oppIds.length} opportunities`);
        } else {
          listingsUpdated += oppIds.length;
        }

      } catch (emailError: any) {
        console.error(`Error sending email to ${email}:`, emailError);
        errors.push(`Failed to send email to ${email}: ${emailError.message}`);
      }
    }

    console.log(`Reminder process complete. Sent ${emailsSent} emails covering ${listingsUpdated} listings.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${emailsSent} consolidated reminder emails covering ${listingsUpdated} listings`,
        emails_sent: emailsSent,
        listings_updated: listingsUpdated,
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
